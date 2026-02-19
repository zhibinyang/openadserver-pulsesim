# OpenAdServer PulseSim-2026

[中文文档](./README.zh-CN.md)

**PulseSim-2026** is a sophisticated traffic simulation engine designed for OpenAdServer. It generates highly realistic, story-driven ad traffic patterns using LLM (Large Language Model) generated scenarios and a deterministic probability engine.

## 🚀 Key Features

*   **LLM-Driven Scenarios**: Uses Gemini AI to generate daily traffic scripts (`daily_script.json`) based on real-world events and holidays.
*   **Realistic Traffic Distribution**: Programmatically generates user pools based on authentic market share data (Country, OS, Browser).
*   **Dynamic QPS**: Simulates natural 24-hour traffic curves with day/night cycles and random volatility.
*   **Event Simulation**:
    *   **Ad Requests**: Validates targeting matching.
    *   **Clicks & Conversions**: Realistic CTR (2%) and CVR (5%) with long-tail time delays (up to 24h).
*   **Hot Reloading**: Automatically detects and applies changes to the daily script without restart.
*   **Docker Ready**: simple containerized deployment.

## 📦 Installation

### Prerequisites
*   Node.js (v18+)
*   Docker & Docker Compose (Optional)
*   OpenAdServer API Access

### Setup via Docker (Recommended)
1.  Clone the repository.
2.  Configure environment variables:
    ```bash
    cp .env.example .env
    # Edit .env to add your GEMINI_API_KEY and OPENADSERVER_HOST
    ```
3.  Start the service:
    ```bash
    docker-compose up -d --build
    ```

### Manual Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build the project:
    ```bash
    npm run build
    ```
3.  Start the engine:
    ```bash
    npm run start:prod
    ```

## 🛠 Usage & Control

### Monitoring Stats
View real-time traffic statistics (HTTP status codes per endpoint):
```bash
curl http://localhost:3002/stats
```
*   `201`: Ad Filled (Success)
*   `204`: Ad Request valid but no candidates returned

### Manual Script Generation
Force the Director to generate a new daily scenario immediately:
```bash
curl -X POST http://localhost:3002/script/generate
```

## 📂 Project Structure

*   `src/director`: AI Agent that generates the daily traffic script.
*   `src/engine`: Core simulation loop (`Pulse`), probability engine, and event queue.
*   `src/registry`: Synchronizes campaign data from OpenAdServer.
*   `src/tests`: Test scripts for individual components.
*   `scripts`: Stores the generated `daily_script.json`.

## 🧪 Testing

Run individual component tests:
```bash
# Test Director (Generate Script)
npx ts-node src/tests/test-director.ts

# Test Pulse Engine (Run Loop)
npx ts-node src/tests/test-events.ts
```

## License
MIT
