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

// Generic Retry Helper
async function performGeminiAction(actionFn, retries = 8, initialDelay = 2000) {
    let currentDelay = initialDelay;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await actionFn();
        } catch (error) {
            const isRateLimit = error.message.includes("429") ||
                error.message.includes("503") ||
                error.message.includes("Resource exhausted") ||
                error.message.includes("Too Many Requests");

            if (!isRateLimit || attempt === retries) {
                throw error; // Not retryable or out of retries
            }

            // Add Jitter: random value between 0 and 1000ms
            const jitter = Math.floor(Math.random() * 1000);
            const waitTime = currentDelay + jitter;

            logger.warn(`Gemini busy/rate-limited (Attempt ${attempt + 1}). Retrying in ${Math.round(waitTime)}ms... Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Exponential Backoff: Multiply by 1.5, but cap at 15 seconds
            currentDelay = Math.min(currentDelay * 1.5, 15000);
        }
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
        const uploadResult = await performGeminiAction(() =>
            fileManager.uploadFile(tempFilePath, {
                mimeType: "application/pdf",
                displayName: fileName,
            })
        );

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
IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
You MUST:
- Read and extract text from ALL images in the PDF
- Process handwritten text using OCR
- Handle both printed and handwritten content
- Analyze all visual content including diagrams, equations, and annotations
- If the PDF contains only images, treat them as the primary source material

You are an expert exam-oriented study assistant.
I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.

Your task is to generate a **structured, easy-to-understand Cheat Sheet** in **Markdown format**.
The goal is to provide short notes that are readable, logically grouped, and exam-ready.

**GUIDELINES:**
1.  **Format**: Use Markdown.
    *   Use \`### headings\` for sections.
    *   Use \`*\` for bullet points.
    *   Use \`**bold**\` for key terms and important emphasis.
    *   Use LaTeX for formulas (e.g., $E = mc^2$).
2.  **Content Style**:
    *   **Short & Punchy**: Keep explanations concise but clear.
    *   **Understandable**: Don't just list keywords; explain *relationships* briefly (e.g., "X increases because Y...").
    *   **Grouped**: Organize by topic/concept.
3.  **Structure**:
    *   Start with **Basics / Definitions**.
    *   Move to **Key Reactions / Formulas / Mechanisms**.
    *   Include **Special Cases / Exceptions**.
    *   Mention **Common Applications / Uses**.
4.  **Math/Chemistry**:
    *   Ensure all equations are formatted correctly in LaTeX between single dollar signs ($...$).
    *   Example: $R-MgX + H_2O \\rightarrow RH + Mg(OH)X$.

**OUTPUT FORMAT JSON:**
{
  "cheat_sheet": "MARKDOWN_STRING"
}

**IMPORTANT**:
- The value of "cheat_sheet" MUST be a single string containing the entire Markdown content.
- Do NOT return an array.
- properly escape newlines and quotes in the JSON string.
`;
        } else {
            prompt = `
IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
You MUST:
- Read and extract text from ALL images in the PDF
- Process handwritten text using OCR
- Handle both printed and handwritten content
- Analyze all visual content including diagrams, equations, and annotations
- If the PDF contains only images, treat them as the primary source material

You are a strict, exam-focused study assistant.
I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.
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

        const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
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
    document: "study_results/{docId}",
    cpu: 2,
    memory: "1GiB",
    timeoutSeconds: 300
}, async (event) => {
    const newData = event.data.after.data();
    const previousData = event.data.before.data();
    const docRef = event.data.after.ref;

    // Check what was requested
    const requestFlashcards = newData.requestFlashcards && !previousData.requestFlashcards;
    const requestQuiz = newData.requestQuiz && !previousData.requestQuiz;
    const requestDetailedSummary = newData.requestDetailedSummary && !previousData.requestDetailedSummary;
    const requestLongQuestions = newData.requestLongQuestions && !previousData.requestLongQuestions;
    const requestProbableQuestions = newData.requestProbableQuestions && !previousData.requestProbableQuestions;

    if (!requestFlashcards && !requestQuiz && !requestDetailedSummary && !requestLongQuestions && !requestProbableQuestions) {
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
        if (requestLongQuestions) errorUpdate.longQuestions = { error: "File source missing. Please re-upload." };
        if (requestProbableQuestions) errorUpdate.probableQuestions = { error: "File source missing. Please re-upload." };

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
            try {
                logger.log("Generating Detailed Summary...");

                // Preserve the original cheat-sheet summary before generating detailed
                const cheatSheetSummary = newData.summary;

                const prompt = `
                IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
                You MUST:
                - Read and extract text from ALL images in the PDF
                - Process handwritten text using OCR
                - Handle both printed and handwritten content
                - Analyze all visual content including diagrams, equations, and annotations
                - If the PDF contains only images, treat them as the primary source material
                
                You are a strict, exam-focused study assistant.
                I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.
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

                const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
                const output = JSON.parse(result.response.text());

                // Store both summaries: cheat-sheet preserved, detailed as new
                batch.update(docRef, {
                    cheatSheetSummary: cheatSheetSummary, // Preserve original
                    detailedSummary: output, // Store detailed separately
                    summary: output, // Current display (detailed)
                    summaryMode: 'detailed',
                    requestDetailedSummary: false,
                    hasDetailedSummary: true // Flag for frontend
                });
                hasUpdates = true;
            } catch (error) {
                logger.error("Error generating detailed summary:", error);
                batch.update(docRef, {
                    requestDetailedSummary: false,
                    summaryError: error.message.includes('429')
                        ? 'Rate limit reached. Please try again in a few moments.'
                        : 'Failed to generate detailed summary. Please try again.'
                });
                hasUpdates = true;
            }
        }


        if (requestFlashcards) {
            try {
                logger.log("Generating Flashcards...");
                const prompt = `
IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
You MUST:
- Read and extract text from ALL images in the PDF
- Process handwritten text and equations
- Handle both printed and handwritten content
- Analyze diagrams and visual annotations
- If the PDF contains only images, treat them as the primary source material

Analyze this study material and generate flashcards.

GUIDELINES:
- Create 10-15 flashcards covering key concepts
- Each flashcard should have:
  * front: A clear question or term
  * back: A concise answer (maximum 15 words, but can include equations/formulas)
- Focus on important definitions, concepts, formulas, and facts
- Include visual elements like equations if present
- Prioritize exam-relevant content

OUTPUT FORMAT (strict JSON):
{
  "flashcards": [
    {
      "front": "term or question",
      "back": "definition or answer (max 15 words)"
    }
  ]
}`;
                const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
                const output = JSON.parse(result.response.text());
                batch.update(docRef, { flashcards: output.flashcards, requestFlashcards: false });
                hasUpdates = true;
            } catch (error) {
                logger.error("Error generating flashcards:", error);
                batch.update(docRef, {
                    requestFlashcards: false,
                    flashcardsError: error.message.includes('429')
                        ? 'Rate limit reached. Please try again in a few moments.'
                        : 'Failed to generate flashcards. Please try again.'
                });
                hasUpdates = true;
            }
        }

        if (requestLongQuestions) {
            try {
                logger.log("Generating Long Questions...");
                const prompt = `
                IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
                You MUST:
                - Read and extract text from ALL images in the PDF
                - Process handwritten text using OCR
                - Handle both printed and handwritten content
                - Analyze all visual content including diagrams, equations, and annotations
                - If the PDF contains only images, treat them as the primary source material
                
                You are a strict, exam-focused study assistant for Indian University Students.
                I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.

                Your task is to generate **10 LONG ANSWER QUESTIONS (5 Marks each)** based on the content.
                
                GUIDELINES:
                1. **Context**: These questions represent descriptive questions common in Indian engineering/science curricula.
                2. **Structure**: They should feel academic, structured, and detailed.
                3. **Content**: Focus on "Derive", "Explain in detail", "Compare and Contrast", "Discuss the construction and working".
                
                OUTPUT FORMAT JSON (strict):
                {
                  "longQuestions": [
                    {
                      "question": "The actual question text",
                      "answerKey": "Key points that must be included in the answer (bullet points)",
                      "marks": 5
                    }
                  ]
                }
                `;

                const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
                const output = JSON.parse(result.response.text());
                batch.update(docRef, { longQuestions: output.longQuestions, requestLongQuestions: false });
                hasUpdates = true;
            } catch (error) {
                logger.error("Error generating long questions:", error);
                batch.update(docRef, {
                    requestLongQuestions: false,
                    longQuestionsError: error.message.includes('429')
                        ? 'Rate limit reached. Please try again in a few moments.'
                        : 'Failed to generate long questions. Please try again.'
                });
                hasUpdates = true;
            }
        }



        if (requestProbableQuestions) {
            try {
                logger.log("Generating Probable Questions...");
                const prompt = `
                IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
                You MUST:
                - Read and extract text from ALL images in the PDF
                - Process handwritten text using OCR
                - Handle both printed and handwritten content
                - Analyze all visual content including diagrams, equations, and annotations
                - If the PDF contains only images, treat them as the primary source material
                
                You are a strict, exam-focused study assistant.
                I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.

                Your task is to identify or generate **10 MOST PROBABLE QUESTIONS** that are likely to appear in an exam.

                STRATEGY:
                1. **Search**: First, look for explicitly marked questions in the content (e.g., "Imp", "PYQ", "2023", "Important").
                2. **Generate**: If no explicit questions are found, generate questions based on the most critical concepts, repeated themes, or core definitions.
                3. **Prioritize**: Focus on "Repeated" or "High Weightage" topics.

                OUTPUT FORMAT JSON (strict):
                {
                  "probableQuestions": [
                    {
                      "question": "The question text",
                      "probability": "High" | "Medium",
                      "reason": "Why this is likely (e.g., 'Marked as Important', 'Core Concept', 'Frequent PYQ')"
                    }
                  ]
                }
                `;

                const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
                const output = JSON.parse(result.response.text());
                batch.update(docRef, { probableQuestions: output.probableQuestions, requestProbableQuestions: false });
                hasUpdates = true;
            } catch (error) {
                logger.error("Error generating probable questions:", error);
                batch.update(docRef, {
                    requestProbableQuestions: false,
                    probableQuestionsError: error.message.includes('429')
                        ? 'Rate limit reached. Please try again in a few moments.'
                        : 'Failed to generate probable questions. Please try again.'
                });
                hasUpdates = true;
            }
        }

        if (requestQuiz) {
            try {
                logger.log("Generating Quiz...");
                const prompt = `
                IMPORTANT: This PDF may contain handwritten notes, scanned images, or typed text.
                You MUST:
                - Read and extract text from ALL images in the PDF
                - Process handwritten text using OCR
                - Handle both printed and handwritten content
                - Analyze all visual content including diagrams, equations, and annotations
                - If the PDF contains only images, treat them as the primary source material
                
                You are a strict, exam-focused study assistant.
                I will provide you with a PDF (study material) which may be handwritten, typed, or scanned.

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
                      "answer": "Option B",
                      "explanation": "A clear, concise explanation (1-2 sentences) of why this answer is correct and/or why other options are incorrect."
                    }
                  ]
                }
                
                IMPORTANT:
                - "answer" must EXACTLY match one of the string values in "options".
                - Do not label options with A), B), etc. inside the string, just provide the text.
                - Ensure options are plausible distractors.
                - "explanation" should provide educational value by clarifying the concept and helping students understand why the correct answer is right.`;

                const result = await performGeminiAction(() => model.generateContent([filePart, prompt]));
                const output = JSON.parse(result.response.text());
                batch.update(docRef, { quiz: output.quiz, requestQuiz: false });
                hasUpdates = true;
            } catch (error) {
                logger.error("Error generating quiz:", error);
                batch.update(docRef, {
                    requestQuiz: false,
                    quizError: error.message.includes('429')
                        ? 'Rate limit reached. Please try again in a few moments.'
                        : 'Failed to generate quiz. Please try again.'
                });
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await batch.commit();
        }

    } catch (error) {
        logger.error("Critical error in generateAdditionalFeatures:", error);
        // Fallback error handling - should rarely reach here
        await docRef.set({
            criticalError: error.message,
            requestFlashcards: false,
            requestQuiz: false,
            requestDetailedSummary: false,
            requestLongQuestions: false,
            requestProbableQuestions: false
        }, { merge: true });
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

// Force release v2
