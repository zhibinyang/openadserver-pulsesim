import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { CampaignRegistry } from '../registry';
import { GeminiClient } from './gemini-client';
import { USER_PROMPT_TEMPLATE } from './prompts';

export class Director {
    private static instance: Director;
    private registry: CampaignRegistry;
    private gemini: GeminiClient;
    private scriptPath: string;

    private constructor() {
        this.registry = CampaignRegistry.getInstance();
        this.gemini = new GeminiClient();
        this.scriptPath = path.resolve(__dirname, '../../scripts/daily_script.json');
    }

    public static getInstance(): Director {
        if (!Director.instance) {
            Director.instance = new Director();
        }
        return Director.instance;
    }

    /**
     * Initialize the Director and schedule daily generation
     */
    public async initialize(): Promise<void> {
        console.log('Initializing Director...');

        // Schedule task for 00:00 UTC explicitly
        // Note: node-cron runs in local server time by default, but we can try to adhere to the requirement
        // For simplicity here, we stick to the cron syntax. 
        // To strictly support UTC, we'd need to check timezone or use a library that supports it.
        // '0 0 * * *' runs at midnight.
        cron.schedule('0 0 * * *', async () => {
            console.log('Running daily script generation job...');
            await this.generateDailyScript();
        }, {
            timezone: "Etc/UTC" // Requires 'cron' package usually, 'node-cron' has some timezone support
        });
    }

    /**
     * Generation Trigger
     */
    public async generateDailyScript(): Promise<void> {
        try {
            // 1. Refresh campaigns
            await this.registry.refresh();
            const campaigns = this.registry.getCampaigns();
            const date = new Date().toISOString().split('T')[0];

            if (campaigns.length === 0) {
                console.warn('No active campaigns found. Generating script with empty campaign context.');
            }

            // 2. Build Prompt
            const prompt = USER_PROMPT_TEMPLATE(date, campaigns);

            // 3. Call LLM
            console.log('Calling Gemini to generate market script...');
            const script = await this.gemini.generateScript(prompt);

            // 4. Save to file
            await this.saveScript(script);

            console.log(`Daily script generated and saved to ${this.scriptPath}`);
            console.log(`Scenario: ${script.scenario_name}`);
        } catch (error) {
            console.error('Failed to generate daily script:', error);
        }
    }

    private async saveScript(script: any): Promise<void> {
        try {
            const dir = path.dirname(this.scriptPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.scriptPath, JSON.stringify(script, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error saving daily script file:', error);
            throw error;
        }
    }
}
