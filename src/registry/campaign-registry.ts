import axios from 'axios';
import { Targeting } from './types';
import dotenv from 'dotenv';

dotenv.config();

export class CampaignRegistry {
    private static instance: CampaignRegistry;
    private campaigns: Map<number, Targeting> = new Map();
    private lastUpdated: Date | null = null;
    private readonly serviceUrl: string;
    private readonly apiKey: string | undefined;

    private constructor() {
        this.serviceUrl = process.env.OAS_INTERNAL_SERVICE_URL || process.env.OPENADSERVER_HOST || 'http://localhost:3000';
        this.apiKey = process.env.OAS_INTERNAL_API_KEY;
    }

    public static getInstance(): CampaignRegistry {
        if (!CampaignRegistry.instance) {
            CampaignRegistry.instance = new CampaignRegistry();
        }
        return CampaignRegistry.instance;
    }

    public async initialize(): Promise<void> {
        console.log('Initializing CampaignRegistry...');
        await this.refresh();
    }

    public async refresh(): Promise<void> {
        try {
            console.log(`Fetching campaigns from ${this.serviceUrl}/api/v1/targeting...`);
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (this.apiKey) {
                headers['X-API-Key'] = this.apiKey;
            }
            const response = await axios.get<Targeting[]>(`${this.serviceUrl}/api/v1/targeting`, { headers });

            const targetingList = response.data;
            this.campaigns.clear();

            for (const targeting of targetingList) {
                if (targeting.campaign && targeting.campaign.is_active) {
                    this.campaigns.set(targeting.campaign_id, targeting);
                }
            }

            this.lastUpdated = new Date();
            console.log(`CampaignRegistry updated. Active campaigns: ${this.campaigns.size}`);
        } catch (error) {
            console.error('❌ [Registry] Failed to sync with AdServer. Keeping existing cache.');
            if (axios.isAxiosError(error)) {
                console.error(`   Error: ${error.message}`);
            }
        }
    }

    public getCampaigns(): Targeting[] {
        return Array.from(this.campaigns.values());
    }

    public getCampaign(id: number): Targeting | undefined {
        return this.campaigns.get(id);
    }

    public getLastUpdated(): Date | null {
        return this.lastUpdated;
    }
}
