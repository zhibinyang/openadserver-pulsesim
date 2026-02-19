
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    console.log('Testing Raw Gemini SDK...');
    const modelName = process.env.GEMINI_MODEL;
    if (!modelName) {
        throw new Error("GEMINI_MODEL env var is missing!");
    }
    console.log(`Using model: ${modelName}`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        const result = await model.generateContent("Explain AI in 5 words.");
        console.log('Response:', result.response.text());
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
