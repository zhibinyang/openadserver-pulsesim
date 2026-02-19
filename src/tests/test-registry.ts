import { CampaignRegistry } from '../registry/campaign-registry';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('--- Testing CampaignRegistry ---');
    const registry = CampaignRegistry.getInstance();

    try {
        await registry.initialize();

        const campaigns = registry.getCampaigns();
        console.log(`\nLoaded ${campaigns.length} campaigns:`);
        campaigns.forEach(c => {
            console.log(`- [${c.campaign_id}] ${c.campaign.name} (Status: ${c.campaign.status})`);
            console.log(`  Targeting: ${JSON.stringify(c.rule_value)}`);
        });

        console.log('\n--- Test Complete ---');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

main();
