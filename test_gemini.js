require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // There isn't a direct listModels method on the client instance in some versions, 
        // but let's try to just run a simple generation with a fallback model if possible,
        // or use the error message to guide us. 
        // Actually, the error message said: "Call ListModels to see the list of available models".
        // The SDK might not expose listModels directly on the main class in older versions, 
        // but let's check if we can find a working model by trying a few common ones.

        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        for (const modelName of modelsToTry) {
            console.log(`Trying model: ${modelName}`);
            try {
                const m = genAI.getGenerativeModel({ model: modelName });
                const result = await m.generateContent("Hello");
                const response = await result.response;
                console.log(`SUCCESS: ${modelName} works! Response: ${response.text()}`);
                return; // Found one!
            } catch (e) {
                console.log(`FAILED: ${modelName} - ${e.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
