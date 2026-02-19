import { Pulse } from '../engine/pulse';
import { MonitoringServer } from '../server';
import { ProbabilityEngine } from '../engine/probability';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('--- Testing Events (Extended Duration) ---');

    // monkey-patch ProbabilityEngine to boost rates for this test
    const prob = ProbabilityEngine.getInstance();
    // @ts-ignore
    prob.BASE_CTR = 0.5; // Boost CTR to 50%
    // @ts-ignore
    prob.BASE_CVR = 0.5; // Boost CVR to 50%
    console.log('⚡️ Probability Boosted: CTR=50%, CVR=50%');

    const pulse = Pulse.getInstance();
    const monitor = new MonitoringServer(3002); // Use diff port to avoid conflict

    monitor.start();
    await pulse.start();

    console.log('Pulse Engine running for 30 seconds to capture Conversions...');

    // Poll stats every 5 seconds
    const interval = setInterval(async () => {
        try {
            const res = await axios.get('http://localhost:3002/stats');
            const stats = res.data.stats;
            const clicks = stats['/tracking/click'] || {};
            const conversions = stats['/tracking/conversion'] || {};
            // Note: OpenAdServer tracking paths might vary, but Pulse records the URL it calls.
            // We'll just dump all stats.
            console.log('📊 Current Stats:', JSON.stringify(stats, null, 2));
        } catch (err) {
            // ignore conn refused if server stopping
        }
    }, 5000);

    // Stop after 30s
    setTimeout(() => {
        clearInterval(interval);
        console.log('Stopping...');
        pulse.stop();
        monitor.stop();
        console.log('--- Test Complete ---');
        process.exit(0);
    }, 30000);
}

main();
