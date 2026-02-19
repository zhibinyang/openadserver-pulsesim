import { Pulse } from '../engine/pulse';
import { MonitoringServer } from '../server';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('--- Testing Pulse Engine & Monitor ---');

    const pulse = Pulse.getInstance();
    const monitor = new MonitoringServer(3002);

    monitor.start();
    await pulse.start();

    console.log('Pulse Engine running...');

    // Wait 5 seconds, then query stats
    setTimeout(async () => {
        try {
            console.log('🔍 Querying Stats...');
            const res = await axios.get('http://localhost:3002/stats');
            console.log('📊 Stats Received:', JSON.stringify(res.data, null, 2));
        } catch (err) {
            console.error('❌ Failed to Query Stats:', err);
        }
    }, 5000);

    // Stop after 10s
    setTimeout(() => {
        console.log('Stopping...');
        pulse.stop();
        monitor.stop();
        console.log('--- Test Complete ---');
        process.exit(0);
    }, 10000);
}

main();
