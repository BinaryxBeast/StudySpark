const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { defineSecret } = require("firebase-functions/params");

// Securely access your API Key
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

initializeApp();

exports.processStudyMaterial = onObjectFinalized({
    secrets: [GEMINI_API_KEY],
    cpu: 1, // Gemini needs a bit of power to handle large PDFs
    memory: "512MiB"
}, async (event) => {
    const filePath = event.data.name; // The path to your PDF
    const bucketName = event.data.bucket;

    // 1. Only process PDF files
    if (!filePath.endsWith(".pdf")) {
        return logger.log("Not a PDF, skipping.");
    }

    // 2. Download the PDF from Firebase Storage into memory
    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(filePath);
    const [fileBuffer] = await file.download();

    // 3. Initialize Gemini 2.0 Flash
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" } // Force JSON output
    });

    // 4. The "Golden Prompt"
    const prompt = `
    Analyze this PDF and create study materials. 
    Return ONLY a JSON object with:
    {
      "summary": "5 bullet points",
      "quiz": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}],
      "flashcards": [{"front": "term", "back": "definition"}]
    }
  `;

    // 5. Send PDF to Gemini
    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: fileBuffer.toString("base64")
                }
            },
            prompt
        ]);

        const output = JSON.parse(result.response.text());

        // 6. Save the results to Firestore so the Frontend can see them
        const docId = filePath.replace(/\.[^/.]+$/, ""); // Use filename as ID
        await getFirestore().collection("study_results").doc(docId).set({
            ...output,
            processedAt: new Date().toISOString(),
            originalFile: filePath
        });

        logger.log("Study materials generated successfully!");
    } catch (error) {
        logger.error("Gemini Error:", error);
    }
});
