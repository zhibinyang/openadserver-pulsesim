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
            const llmResponse = await this.gemini.generateScript(prompt);

            // 4. Generate Programmatic User Pool
            console.log('Generating logical user pool based on trends...');
            const targetPool = this.generateUserPool(llmResponse.traffic_trends);

            // Merge back
            const finalScript = {
                ...llmResponse,
                target_pool: targetPool
            };

            // 5. Save to file
            await this.saveScript(finalScript);

            console.log(`Daily script generated and saved to ${this.scriptPath}`);
            console.log(`Scenario: ${finalScript.scenario_name}`);
            console.log(`Users Generated: ${finalScript.target_pool.length}`);
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

    /**
     * Programmatically generate users based on Market Demographics and LLM Trends
     */
    private generateUserPool(trafficTrends: any): any[] {
        const poolSize = 100; // Generate 100 base users for the pool
        const pool: any[] = [];

        // Import demographics (lazily or standard import to avoid clutter)
        const { MARKET_DEMOGRAPHICS, DEVICE_MAPPING } = require('./market-demographics');
        const { v4: uuidv4 } = require('uuid');

        // Helper: Weighted Random Selection
        const pickWeighted = (weights: Record<string, number>, modifiers: Record<string, number> = {}): string => {
            let total = 0;
            const entries = Object.entries(weights);
            const adjWeights = entries.map(([k, w]) => {
                const mod = modifiers[k] || modifiers[`${k}`] || 1.0;
                const finalW = w * mod;
                total += finalW;
                return { k, w: finalW };
            });

            const r = Math.random() * total;
            let sum = 0;
            for (const { k, w } of adjWeights) {
                sum += w;
                if (r <= sum) return k;
            }
            return entries[0][0]; // Fallback
        };

        const generateIP = (country: string): string => {
            // Very Mock IP generation. Real geo-ip logic is complex.
            // We just prefix to look semi-valid.
            const prefixes: any = { 'US': 104, 'CN': 202, 'JP': 150, 'GB': 80 };
            const p1 = prefixes[country] || (Math.floor(Math.random() * 200) + 10);
            return `${p1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        };

        // Extract modifiers from LLM response
        const countryMods = trafficTrends?.country_weights || {};
        const osMods = trafficTrends?.os_weights || {};
        const browserMods = trafficTrends?.browser_weights || {};

        for (let i = 0; i < poolSize; i++) {
            // Cascade Selection
            const country = pickWeighted(MARKET_DEMOGRAPHICS.countries, countryMods);
            const os = pickWeighted(MARKET_DEMOGRAPHICS.os, osMods);
            const browser = pickWeighted(MARKET_DEMOGRAPHICS.browser, browserMods); // Simplified: Assume independent for now, though Safari~iOS strictly

            // Correction: Enforce Safari on iOS
            let finalBrowser = browser;
            if (os === 'ios') finalBrowser = 'safari';
            if (os === 'macos' && browser === 'edge') finalBrowser = 'safari'; // Bias mac to safari/chrome

            // Select Device
            const devices = DEVICE_MAPPING[os] || ['generic'];
            const device = devices[Math.floor(Math.random() * devices.length)];

            // Interests (random mix)
            const interestsList = ['tech', 'news', 'sports', 'finance', 'fashion', 'travel', 'gaming', 'music'];
            const interests = [];
            if (Math.random() > 0.5) interests.push(interestsList[Math.floor(Math.random() * interestsList.length)]);
            if (Math.random() > 0.5) interests.push(interestsList[Math.floor(Math.random() * interestsList.length)]);

            pool.push({
                // user_id removed - generated at runtime by Pulse
                slot_id: `s_${Math.floor(Math.random() * 10000)}`,
                slot_type: 1, // Banner
                country,
                city: 'Unknown', // Placeholder
                ip: generateIP(country),
                os,
                browser: finalBrowser,
                device,
                app_id: `com.app.${Math.floor(Math.random() * 500)}`,
                age: Math.floor(Math.random() * 40) + 18,
                gender: Math.random() > 0.5 ? 'M' : 'F',
                interests,
                page_context: 'content'
            });
        }

        return pool;
    }
}
