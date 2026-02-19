import axios from 'axios';
import pLimit from 'p-limit';
import { CampaignRegistry } from '../registry';
import { ProbabilityEngine } from './probability';
import { FutureEventQueue } from './queue';
import { StatsCollector } from './stats';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

interface DailyScript {
    scenario_name: string;
    feature_modifiers: Record<string, number>;
    target_pool: any[];
}

export class Pulse {
    private static instance: Pulse;
    private isRunning: boolean = false;
    private scriptPath: string;
    private currentScript: DailyScript | null = null;

    private registry: CampaignRegistry;
    private probabilityEngine: ProbabilityEngine;
    private eventQueue: FutureEventQueue;

    private qpsLimit = pLimit(5); // Default 5 QPS

    constructor() {
        this.scriptPath = path.resolve(__dirname, '../../scripts/daily_script.json');
        this.registry = CampaignRegistry.getInstance();
        this.probabilityEngine = ProbabilityEngine.getInstance();
        this.eventQueue = FutureEventQueue.getInstance();
    }

    public static getInstance(): Pulse {
        if (!Pulse.instance) {
            Pulse.instance = new Pulse();
        }
        return Pulse.instance;
    }

    public async start() {
        if (this.isRunning) return;

        console.log('Starting Pulse Engine...');
        await this.loadScript();
        this.watchScript();

        // Start components
        this.eventQueue.start();
        await this.registry.initialize();

        this.isRunning = true;
        this.loop();
    }

    public stop() {
        this.isRunning = false;
        this.eventQueue.stop();
        console.log('Pulse Engine stopped.');
    }

    private async loadScript() {
        try {
            const data = await fs.readFile(this.scriptPath, 'utf-8');
            this.currentScript = JSON.parse(data);
            console.log(`✅ [Pulse] Loaded Script: ${this.currentScript?.scenario_name}`);
            console.log(`   Target Pool Size: ${this.currentScript?.target_pool.length}`);
        } catch (error) {
            console.error('⚠️ [Pulse] Failed to load daily_script.json. Waiting for file...');
            this.currentScript = null;
        }
    }

    private watchScript() {
        console.log(`[Pulse] Watching for script updates: ${this.scriptPath}`);
        // fs.watch is persistent
        (async () => {
            try {
                const watcher = fs.watch(this.scriptPath);
                for await (const event of watcher) {
                    if (event.eventType === 'change' || event.eventType === 'rename') {
                        console.log('[Pulse] Script update detected, reloading...');
                        // Small delay to ensure write complete
                        await new Promise(r => setTimeout(r, 500));
                        await this.loadScript();
                    }
                }
            } catch (err) {
                console.error('[Pulse] Watcher error:', err);
            }
        })();
    }

    private async loop() {
        while (this.isRunning) {
            if (!this.currentScript || this.currentScript.target_pool.length === 0) {
                console.warn('No script or empty pool. Waiting 5s...');
                await new Promise(r => setTimeout(r, 5000));
                await this.loadScript();
                continue;
            }

            // Fire a batch of requests (simulate QPS)
            // For exact QPS, we might need a precise token bucket. 
            // For now, we just loop and let pLimit throttle the CONCURRENCY, 
            // but to control RATE, we need a slight delay.

            const p = this.simulateSingleRequest();

            // Control loop speed (approx 5 req/s -> 200ms delay)
            await new Promise(r => setTimeout(r, 200));
        }
    }

    private async simulateSingleRequest() {
        return this.qpsLimit(async () => {
            try {
                if (!this.currentScript) return;

                // 1. Pick User
                const pool = this.currentScript.target_pool;
                const user = pool[Math.floor(Math.random() * pool.length)];

                // 2. Prepare Request
                // We enforce the ad-request.dto structure
                const adRequest = {
                    ...user,
                    request_id: uuidv4(),
                    timestamp: Date.now()
                };

                // 3. Send to AdServer
                const host = process.env.OPENADSERVER_HOST || 'http://localhost:3000';
                // User provided curl uses /ad/get, so we align with that. 
                // Previous assumption of /api/v1/ad/get might be wrong or dependent on gateway.
                const url = `${host}/ad/get`;

                // console.log(`[Pulse] Sending Req (${user.country}, ${user.os})...`);

                const response = await axios.post(url, adRequest, {
                    validateStatus: () => true // Do not throw on error status
                });

                // Record Stats
                StatsCollector.getInstance().record(url, response.status);

                if (response.status >= 200 && response.status < 300) {
                    if (response.data && response.data.ad) {
                        this.handleAdImpression(response.data.ad, user);
                    }
                } else {
                    console.warn(`⚠️ [Pulse] Request Failed. Status: ${response.status} | URL: ${url}`);
                    console.warn(`   Response: ${JSON.stringify(response.data)}`);
                    console.warn(`   Request Payload: ${JSON.stringify(adRequest)}`);
                }

            } catch (error) {
                console.error(`❌ [Pulse] Network Error: ${(error as any).message}`);
            }
        });
    }

    private handleAdImpression(ad: any, user: any) {
        if (!this.currentScript) return;

        // console.log(`[Impression] Ad ID ${ad.id} served to ${user.user_id}`);

        // Check Click
        if (this.probabilityEngine.shouldClick(user, this.currentScript.feature_modifiers)) {
            // Schedule Click
            // We need the click URL from the ad response. 
            // Assuming standard OpenAdServer format: ad.click_url or specific tracking endpoint.
            // For this simulation, let's assume we construct it or it's provided.

            const clickUrl = ad.click_url || `${process.env.OPENADSERVER_HOST}/api/v1/ad/click?id=${ad.id}`;

            // Random delay 1-5s
            const delay = Math.floor(Math.random() * 4000) + 1000;

            this.eventQueue.addEvent('click', clickUrl, delay);

            // Check Conversion (conditional on click)
            if (this.probabilityEngine.shouldConvert(user, this.currentScript.feature_modifiers)) {
                // Schedule Conversion
                const convUrl = ad.conversion_url || `${process.env.OPENADSERVER_HOST}/api/v1/ad/conversion?id=${ad.id}`;
                // Random delay 5s - 60s (short for testing)
                const convDelay = delay + Math.floor(Math.random() * 55000) + 5000;

                this.eventQueue.addEvent('conversion', convUrl, convDelay);
            }
        }
    }
}
