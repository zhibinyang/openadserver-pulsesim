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
            const p = this.simulateSingleRequest();

            // Calculate Dynamic Delay based on QPS Curve
            const qps = this.getDynamicQPS();
            const delayMs = Math.floor(1000 / qps);

            // Debug QPS (Sample occasionally to avoid spam)
            if (Math.random() < 0.10) {
                // console.log(`[Pulse Debug] QPS: ${qps.toFixed(2)} | Delay: ${delayMs}ms`);
            }

            // Control loop speed
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    /**
     * Calculates QPS based on Time of Day and Random Volatility
     * Night (0-6): Base 1
     * Day (6-24): Base 3
     * Volatility: 50% - 200%
     */
    private getDynamicQPS(): number {
        const hour = new Date().getHours();
        let baseQPS = 3;

        // Night Mode (00:00 - 05:59)
        if (hour >= 0 && hour < 6) {
            baseQPS = 1;
        }

        // Optional: Simple curve adjustments
        // Peak hours (12-13, 19-21) -> Boost slightly
        if ((hour >= 12 && hour <= 13) || (hour >= 19 && hour <= 21)) {
            baseQPS *= 1.2;
        }

        // Volatility: Random multiplier between 0.5 and 2.0
        const volatility = 0.5 + Math.random() * 1.5;

        const finalQPS = baseQPS * volatility;

        // Ensure strictly positive
        return Math.max(0.1, finalQPS);
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
                    user_id: uuidv4(),
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

                if (response.status >= 200 && response.status < 300) {
                    const data = response.data;
                    // OpenAdServer returns { candidates: [...] }
                    const ad = data.candidates && data.candidates.length > 0 ? data.candidates[0] : (data.ad || null);

                    // Stats: If 201 but no ad, record as 204 (No Content) to distinguish
                    const statusToRecord = (response.status === 201 && !ad) ? 204 : response.status;
                    StatsCollector.getInstance().record(url, statusToRecord);

                    if (ad) {
                        this.handleAdImpression(ad, user);
                    }
                } else {
                    // Record error status
                    StatsCollector.getInstance().record(url, response.status);

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

        // Fire Impression Tracking (Immediate)
        const impUrl = ad.impression_pixel || ad.impression_url;
        if (impUrl) {
            // Delay 0 to fire immediately
            this.eventQueue.addEvent('impression', impUrl, 0);
        }

        // Check Click
        const shouldClick = this.probabilityEngine.shouldClick(user, this.currentScript.feature_modifiers);
        if (shouldClick) {
            // Schedule Click
            // User requested to use 'click_pixel' for simulation as landing_url is a redirect.
            const clickUrl = ad.click_pixel || ad.landing_url || ad.click_url;

            if (clickUrl) {
                // Random delay 5-45s
                const delay = Math.floor(Math.random() * 40000) + 5000;
                this.eventQueue.addEvent('click', clickUrl, delay);

                // Check Conversion (conditional on click)
                if (this.probabilityEngine.shouldConvert(user, this.currentScript.feature_modifiers)) {
                    // Schedule Conversion
                    // OpenAdServer returns 'conversion_pixel' with ${CONVERSION_VALUE} placeholder
                    let convUrl = ad.conversion_pixel || ad.conversion_url;
                    if (convUrl) {
                        // Replace placeholder with random value 10-2000
                        const value = Math.floor(Math.random() * 1991) + 10;
                        convUrl = convUrl.replace('${CONVERSION_VALUE}', value.toString());

                        // Conversion Delay Logic (Long Tail)
                        // Min: 1 minute (60,000ms)
                        // Max: 24 hours (86,400,000ms)
                        const MIN_DELAY = 60 * 1000;
                        const MAX_DELAY = 24 * 60 * 60 * 1000;

                        // Use power function to create long-tail distribution
                        // Math.random() is 0..1. Raising to power 3 biases heavily towards 0 (shorter delays).
                        // result is mostly small, occasionally large.
                        const bias = Math.pow(Math.random(), 3);
                        const tailDelay = Math.floor(bias * (MAX_DELAY - MIN_DELAY));

                        const convDelay = delay + MIN_DELAY + tailDelay;

                        // Debug log for long delays (showing minutes/hours)
                        const debugTime = convDelay / 1000 / 60; // in minutes
                        console.log(`[Pulse Debug] Scheduled Conv in ${debugTime.toFixed(1)} min`);

                        this.eventQueue.addEvent('conversion', convUrl, convDelay);
                    }
                }
            }
        }
    }
}
