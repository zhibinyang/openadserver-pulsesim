import http from 'http';
import { StatsCollector } from './engine/stats';

export class MonitoringServer {
    private server: http.Server;
    private port: number;

    constructor(port: number = 3001) {
        this.port = port;
        this.server = http.createServer((req, res) => {
            // CORS for local dev
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');

            if (req.method === 'GET' && req.url === '/stats') {
                const stats = StatsCollector.getInstance().getStats();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(stats, null, 2));
            } else {
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
