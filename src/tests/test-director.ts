import { Director } from '../director/director';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('--- Testing Director (LLM Generation) ---');

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is missing in .env file');
        process.exit(1);
    }

    const director = Director.getInstance();

    try {
        console.log('Triggering daily script generation...');
        await director.generateDailyScript();
        console.log('\n--- Test Complete ---');
        console.log('Check scripts/daily_script.json for output.');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

main();
