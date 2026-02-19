import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, MARKET_SCRIPT_SCHEMA } from './prompts';

dotenv.config();

export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not defined in environment variables.");
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                responseMimeType: "application/json",
                // @ts-ignore: Schema type definition mismatch in some versions, but valid for structured output
                responseSchema: MARKET_SCRIPT_SCHEMA,
            },
        });
    }

    public async generateScript(prompt: string): Promise<any> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
}
