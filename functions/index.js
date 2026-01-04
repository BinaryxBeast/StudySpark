const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { defineSecret } = require("firebase-functions/params");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Securely access your API Key
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Retry Helper
async function callGeminiWithRetry(model, promptArgs, retries = 3, delay = 2000) {
    try {
        return await model.generateContent(promptArgs);
    } catch (error) {
        if (retries > 0 && (error.message.includes("429") || error.message.includes("503") || error.message.includes("Resource exhausted"))) {
            logger.warn(`Gemini rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGeminiWithRetry(model, promptArgs, retries - 1, delay * 2);
        }
        throw error;
    }
}

initializeApp();

exports.processStudyMaterial = onObjectFinalized({
    secrets: [GEMINI_API_KEY],
    cpu: 2,
    memory: "1GiB",
    timeoutSeconds: 300
}, async (event) => {
    const filePath = event.data.name;
    const bucketName = event.data.bucket;

    if (!filePath.endsWith(".pdf")) {
        return logger.log("Not a PDF, skipping.");
    }

    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(filePath);

    // Download to local temp file
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);

    try {
        await file.download({ destination: tempFilePath });

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY.value());

        // Upload to Gemini
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: "application/pdf",
            displayName: fileName,
        });

        const fileUri = uploadResult.file.uri;
        logger.log(`Uploaded file to Gemini: ${fileUri}`);

        // Define Model
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Initialize Firestore Document
        const docId = filePath.replace(/\.[^/.]+$/, "");
        const docRef = getFirestore().collection("study_results").doc(docId);

        // Fetch Metadata to check for summary mode preference
        const fileMetadata = await file.getMetadata();
        const summaryMode = fileMetadata[0]?.metadata?.summaryMode || 'detailed';

        await docRef.set({
            processedAt: new Date().toISOString(),
            originalFile: filePath,
            status: "processing",
            geminiFileUri: fileUri, // Save URI for on-demand generation
            summaryMode: summaryMode,
            summary: null,
            flashcards: null,
            quiz: null
        }, { merge: true });

        // Define Parallel Tasks using File URI
        const filePart = {
            fileData: {
                mimeType: "application/pdf",
                fileUri: fileUri
            }
        };

        let prompt;
        if (summaryMode === 'cheat-sheet') {
            prompt = `
You are an expert exam-oriented study assistant.
I will provide you with extracted text from a PDF (study material).

Your task is to generate an EXTREMELY SHORT revision cheat sheet using ONLY:
- Keywords
- Short hints
- One-line memory triggers
- Symbols, arrows, abbreviations (→, ⇒, ∴, ≠)

STRICT RULES:
- NO explanations
- NO paragraphs
- NO full definitions
- NO examples
- NO filler text
- Each point must be ≤ 8 words
- Use bullet points only
- Focus on what helps quick recall in exams

INCLUDE:
- Core concepts only
- Important formulas (if any)
- Key terms that students often forget
- Mnemonics where possible

OUTPUT FORMAT JSON:
{
  "cheat_sheet": [
    "Topic: hint",
    "Formula: symbol-based",
    "Term → meaning hint",
    "Trap / confusion point"
  ]
}
The output must feel like a LAST-MINUTE EXAM CHEAT SHEET.`;
        } else {
            prompt = `
You are a strict, exam-focused study assistant.
I will provide you with extracted text from a PDF (study material).
Your task is to generate a DETAILED REVISION GUIDE optimized for EXAMS.
INCLUDE ONLY WHAT IS NECESSARY FOR EXAMS.

STRUCTURE THE OUTPUT INTO THESE SECTIONS:

1. IMPORTANT DEFINITIONS
- Write crisp, exam-ready definitions
- Avoid unnecessary theory
- Highlight keywords in each definition

2. MUST-REVISE CONCEPTS
- List concepts students MUST revise before exams
- Explain briefly why each concept is important

3. MOST IMPORTANT QUESTIONS (Exam-Oriented)
- Generate likely exam questions
- Label each question as:
  - Very Important
  - Important
  - Optional

4. WHAT TO FOCUS ON (Exam Strategy)
- Tell the student:
  - What to memorize
  - What to understand
  - What can be skipped if short on time

5. COMMON MISTAKES / TRAPS
- Points where students usually lose marks
- Conceptual confusions

STRICT RULES:
- No storytelling
- No unnecessary examples
- Keep explanations concise
- Think like a professor setting the exam

OUTPUT FORMAT JSON:
{
  "definitions": [{ "term": "...", "definition": "..." }],
  "must_revise": [{ "concept": "...", "reason": "..." }],
  "important_questions": [{ "question": "...", "importance": "Very Important" }],
  "exam_focus": [{ "topic": "...", "strategy": "Memorize/Understand/Skip" }],
  "common_mistakes": [{ "point": "...", "correction": "..." }]
}`;
        }

        const result = await callGeminiWithRetry(model, [filePart, prompt]);
        const output = JSON.parse(result.response.text());

        await docRef.set({
            summary: output,
            status: "summary_completed" // Indicate basic processing is done
        }, { merge: true });

        logger.log("Summary generated successfully!");

    } catch (error) {
        logger.error("Gemini Error:", error);
        await getFirestore().collection("study_results").doc(filePath.replace(/\.[^/.]+$/, "")).set({
            status: "error",
            error: error.message
        }, { merge: true });
    } finally {
        // Cleanup local temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

exports.generateAdditionalFeatures = onDocumentUpdated({
    secrets: [GEMINI_API_KEY],
    document: "study_results/{docId}"
}, async (event) => {
    const newData = event.data.after.data();
    const previousData = event.data.before.data();
    const docRef = event.data.after.ref;

    // Check what was requested
    const requestFlashcards = newData.requestFlashcards && !previousData.requestFlashcards;
    const requestQuiz = newData.requestQuiz && !previousData.requestQuiz;
    const requestDetailedSummary = newData.requestDetailedSummary && !previousData.requestDetailedSummary;

    if (!requestFlashcards && !requestQuiz && !requestDetailedSummary) {
        return; // No new requests
    }

    const fileUri = newData.geminiFileUri;
    if (!fileUri) {
        // If URI is missing, we can't generate anything.
        // Set error states for requested features.
        const errorUpdate = {};
        if (requestFlashcards) errorUpdate.flashcards = { error: "File source missing. Please re-upload." };
        if (requestQuiz) errorUpdate.quiz = { error: "File source missing. Please re-upload." };
        if (requestDetailedSummary) errorUpdate.summary = { error: "File source missing. Please re-upload." };

        await docRef.set(errorUpdate, { merge: true });
        return logger.error("File URI missing for generation request");
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const filePart = {
        fileData: {
            mimeType: "application/pdf",
            fileUri: fileUri
        }
    };

    try {
        const batch = getFirestore().batch();
        let hasUpdates = false;

        if (requestDetailedSummary) {
            logger.log("Generating Detailed Summary...");
            const prompt = `
            You are a strict, exam-focused study assistant.
            I will provide you with extracted text from a PDF (study material).
            Your task is to generate a DETAILED REVISION GUIDE optimized for EXAMS.
            INCLUDE ONLY WHAT IS NECESSARY FOR EXAMS.
            
            STRUCTURE THE OUTPUT INTO THESE SECTIONS:
            
            1. IMPORTANT DEFINITIONS
            - Write crisp, exam-ready definitions
            - Avoid unnecessary theory
            - Highlight keywords in each definition
            
            2. MUST-REVISE CONCEPTS
            - List concepts students MUST revise before exams
            - Explain briefly why each concept is important
            
            3. MOST IMPORTANT QUESTIONS (Exam-Oriented)
            - Generate likely exam questions
            - Label each question as:
              - Very Important
              - Important
              - Optional
            
            4. WHAT TO FOCUS ON (Exam Strategy)
            - Tell the student:
              - What to memorize
              - What to understand
              - What can be skipped if short on time
            
            5. COMMON MISTAKES / TRAPS
            - Points where students usually lose marks
            - Conceptual confusions
            
            STRICT RULES:
            - No storytelling
            - No unnecessary examples
            - Keep explanations concise
            - Think like a professor setting the exam
            
            OUTPUT FORMAT JSON:
            {
              "definitions": [{ "term": "...", "definition": "..." }],
              "must_revise": [{ "concept": "...", "reason": "..." }],
              "important_questions": [{ "question": "...", "importance": "Very Important" }],
              "exam_focus": [{ "topic": "...", "strategy": "Memorize/Understand/Skip" }],
              "common_mistakes": [{ "point": "...", "correction": "..." }]
            }`;

            const result = await callGeminiWithRetry(model, [filePart, prompt]);
            const output = JSON.parse(result.response.text());
            batch.update(docRef, { summary: output, summaryMode: 'detailed', requestDetailedSummary: false });
            hasUpdates = true;
        }

        if (requestFlashcards) {
            logger.log("Generating Flashcards...");
            const prompt = `Analyze this PDF. Return a JSON object: { "flashcards": [{"front": "term", "back": "definition (max 15 words)"}] }`;
            const result = await callGeminiWithRetry(model, [filePart, prompt]);
            const output = JSON.parse(result.response.text());
            batch.update(docRef, { flashcards: output.flashcards, requestFlashcards: false });
            hasUpdates = true;
        }

        if (requestQuiz) {
            logger.log("Generating Quiz...");
            const prompt = `
            You are a strict, exam-focused study assistant.
            I will provide you with extracted text from a PDF (study material).

            Your task is to generate a **10-QUESTION INTERACTIVE QUIZ** based on the content.
            
            GUIDELINES:
            1. **Quantity**: generate exactly 10 questions if the content allows. If the content is too short, generate as many high-quality questions as possible (minimum 5).
            2. **Difficulty**: Mix straightforward recall questions with conceptual application questions.
            3. **Relevance**: Focus on key concepts, definitions, and "must-know" facts for exams.
            
            OUTPUT FORMAT JSON (strict):
            {
              "quiz": [
                {
                  "question": "The actual question text?",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "answer": "Option B" 
                }
              ]
            }
            
            IMPORTANT:
            - "answer" must EXACTLY match one of the string values in "options".
            - Do not label options with A), B), etc. inside the string, just provide the text.
            - Ensure options are plausible distractors.`;

            const result = await callGeminiWithRetry(model, [filePart, prompt]);
            const output = JSON.parse(result.response.text());
            batch.update(docRef, { quiz: output.quiz, requestQuiz: false });
            hasUpdates = true;
        }

        if (hasUpdates) {
            await batch.commit();
        }

    } catch (error) {
        logger.error("Error generating additional features:", error);
        await docRef.set({ featureError: error.message }, { merge: true });
    }
});

exports.cleanupOldFiles = onSchedule("every 60 minutes", async (event) => {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles();
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
        // file.metadata.timeCreated is available in the List response
        // It's an ISO 8601 string, e.g. "2023-01-01T12:00:00.000Z"
        if (!file.metadata.timeCreated) {
            continue;
        }

        const createdTime = new Date(file.metadata.timeCreated).getTime();

        if (now - createdTime > TWO_HOURS_MS) {
            try {
                await file.delete();
                deletedCount++;
                logger.log(`Deleted old file: ${file.name}`);
            } catch (error) {
                logger.error(`Failed to delete file ${file.name}:`, error);
            }
        }
    }

    logger.log(`Cleanup complete. Deleted ${deletedCount} files.`);
});
