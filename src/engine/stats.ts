export class StatsCollector {
    private static instance: StatsCollector;
    // Map<Path, Map<StatusCode, Count>>
    private stats: Map<string, Record<number, number>> = new Map();
    private lastReset: Date = new Date();

    private constructor() {
        // Schedule hourly reset
        this.scheduleNextReset();
    }

    public static getInstance(): StatsCollector {
        if (!StatsCollector.instance) {
            StatsCollector.instance = new StatsCollector();
        }
        return StatsCollector.instance;
    }

    public record(url: string, status: number) {
        try {
            // Parse path from URL (remove query and domain)
            // If url is absolute (http://...), new URL(url).pathname
            // If relative, just use it or fix data
            let path = url;
            if (url.startsWith('http')) {
                const u = new URL(url);
                path = u.pathname;
            } else {
                // handle relative urls if any 
                path = url.split('?')[0];
            }

            const pathStats = this.stats.get(path) || {};
            pathStats[status] = (pathStats[status] || 0) + 1;
            this.stats.set(path, pathStats);
        } catch (e) {
            console.error('[Stats] Failed to record stat:', e);
        }
    }

    public getStats() {
        // Convert Map to Object for JSON response
        const result: Record<string, Record<number, number>> = {};
        for (const [path, codes] of this.stats.entries()) {
            result[path] = codes;
        }
        return {
            startTime: this.lastReset.toISOString(),
            currentTime: new Date().toISOString(),
            stats: result
        };
    }

    private reset() {
        console.log('[Stats] Hourly Reset triggered.');
        this.stats.clear();
        this.lastReset = new Date();
        this.scheduleNextReset();
    }

    private scheduleNextReset() {
        const now = new Date();
        // Calculate time until next hour :00
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(0);
        nextHour.setMilliseconds(0);

        const delay = nextHour.getTime() - now.getTime();

        setTimeout(() => this.reset(), delay);
    }
}
