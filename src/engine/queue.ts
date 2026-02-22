import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface DelayedEvent {
    id: string;
    type: 'impression' | 'click' | 'conversion';
    url: string; // The attribution URL to call
    executeAt: number; // Timestamp
    payload?: any;
}

export class FutureEventQueue {
    private static instance: FutureEventQueue;
    private queue: DelayedEvent[] = [];
    private isRunning: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;
    private readonly dumpPath = path.join(process.cwd(), 'queue_dump.json');

    private constructor() {
        this.loadFromDisk();
    }

    public static getInstance(): FutureEventQueue {
        if (!FutureEventQueue.instance) {
            FutureEventQueue.instance = new FutureEventQueue();
        }
        return FutureEventQueue.instance;
    }

    private loadFromDisk() {
        if (fs.existsSync(this.dumpPath)) {
            try {
                const data = fs.readFileSync(this.dumpPath, 'utf-8');
                this.queue = JSON.parse(data);
                console.log(`[Queue] Loaded ${this.queue.length} delayed events from disk.`);
                fs.unlinkSync(this.dumpPath); // Remove after loading to prevent stale double-loads
            } catch (e) {
                console.error(`[Queue] Failed to load queue dump: ${e}`);
            }
        }
    }

    private saveToDisk() {
        if (this.queue.length > 0) {
            try {
                fs.writeFileSync(this.dumpPath, JSON.stringify(this.queue), 'utf-8');
                console.log(`[Queue] Saved ${this.queue.length} delayed events to disk.`);
            } catch (e) {
                console.error(`[Queue] Failed to save queue dump: ${e}`);
            }
        }
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('FutureEventQueue started.');

        // Check queue every 1 second
        this.processingInterval = setInterval(() => this.processQueue(), 1000);
    }

    public stop() {
        this.isRunning = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        this.saveToDisk();
        console.log('FutureEventQueue stopped.');
    }

    public addEvent(type: 'impression' | 'click' | 'conversion', url: string, delayMs: number) {
        const event: DelayedEvent = {
            id: uuidv4(),
            type,
            url,
            executeAt: Date.now() + delayMs,
        };
        this.queue.push(event);
        this.queue.sort((a, b) => a.executeAt - b.executeAt); // Keep sorted by time

        // Don't spam the log with zero-delay impressions
        if (delayMs > 0) {
            console.log(`[Queue] Scheduled ${type} in ${Math.round(delayMs / 1000)}s. Queue size: ${this.queue.length}`);
        }
    }

    private async processQueue() {
        if (this.queue.length === 0) return;

        const now = Date.now();
        const readyEvents = [];

        // Extract ready events
        while (this.queue.length > 0 && this.queue[0].executeAt <= now) {
            readyEvents.push(this.queue.shift()!);
        }

        if (readyEvents.length > 0) {
            console.log(`[Queue] Processing ${readyEvents.length} events...`);
            for (const event of readyEvents) {
                this.executeEvent(event);
            }
        }
    }

    private async executeEvent(event: DelayedEvent) {
        try {
            // In a real AdTech scenario, we'd fire a pixel or call an attribution endpoint.
            // Here we simulate it by calling the URL (GET request).

            // Note: If the URL is just a tracking pixel ID, we might need to construct the full URL.
            // Assuming 'url' passed here is the full callback URL provided by the AdServer response.

            // For simulation visualization:
            console.log(`🚀 [FIRE] ${event.type.toUpperCase()} -> ${event.url}`);

            const response = await axios.get(event.url, {
                timeout: 5000,
                validateStatus: () => true
            });

            // Record Stats
            const { StatsCollector } = require('./stats'); // Dynamic import to avoid circular dep if any, or just import at top
            StatsCollector.getInstance().record(event.url, response.status);

        } catch (error) {
            console.error(`❌ [FAIL] ${event.type} event failed: ${event.url}`);
            // Record failure if network error (status 0 or 500 equivalent)
            const { StatsCollector } = require('./stats');
            StatsCollector.getInstance().record(event.url, 0);
        }
    }
}
