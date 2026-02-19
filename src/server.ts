import http from 'http';
import { StatsCollector } from './engine/stats';

export class MonitoringServer {
    private server: http.Server;
    private port: number;

    constructor(port: number = 3002) {
        this.port = port;
        this.server = http.createServer((req, res) => {
            // CORS for local dev
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');

            if (req.method === 'GET' && req.url === '/stats') {
                const stats = StatsCollector.getInstance().getStats();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(stats, null, 2));
            }
            else if (req.method === 'POST' && req.url === '/script/generate') {
                console.log('Received manual script generation request...');
                // Director is singleton, so we can lazily import or use instance if available
                // To avoid circular dependency issues if any, we use dynamic require or ensure Director is safe
                // But Director doesn't depend on Server, so simple import should be fine if we change file top
                // However, let's just use the singleton pattern directly.

                // We need to import Director at top of file
                import('./director/director').then(async ({ Director }) => {
                    try {
                        const director = Director.getInstance();
                        await director.generateDailyScript();
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Script generation triggered' }));
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: String(err) }));
                    }
                });
            }
            else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
    }

    public start() {
        this.server.listen(this.port, () => {
            console.log(`📊 Monitoring Server running at http://localhost:${this.port}/stats`);
        });
    }

    public stop() {
        this.server.close();
    }
}
