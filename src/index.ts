import dotenv from 'dotenv';
import { Director } from './director';
import { Pulse } from './engine';
import { MonitoringServer } from './server';

dotenv.config();

async function main() {
    console.log(`
  ========================================
    PulseSim-2026: Traffic Simulation
  ========================================
  `);

    const director = Director.getInstance();
    const pulse = Pulse.getInstance();
    const monitor = new MonitoringServer(3002);

    // 1. Initialize Director (Starts Cron)
    await director.initialize();

    // 2. Start Stats Server
    monitor.start();

    // 3. Start Pulse Engine (Starts Loop & Watcher)
    await pulse.start();

    // 4. Graceful Shutdown
    const shutdown = async () => {
        console.log('\n\n🛑 Shutting down PulseSim...');
        pulse.stop();
        monitor.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
