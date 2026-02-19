import { SchemaType } from "@google/generative-ai";

export const TARGETING_ENUMS = {
    countries: [
        'US', 'CN', 'JP', 'KR', 'GB', 'DE', 'FR', 'CA',
        'AU', 'IN', 'BR', 'RU', 'SG', 'HK', 'TW', 'ID',
        'TH', 'VN', 'MY', 'PH', 'MX', 'IT', 'ES', 'NL',
        'SE', 'CH', 'PL', 'TR', 'SA', 'AE', 'IL', 'ZA',
        'NG', 'EG', 'AR', 'CL', 'CO', 'NZ', 'IE', 'AT'
    ],
    os: [
        'android', 'ios', 'windows', 'macos', 'linux',
        'chrome os', 'harmonyos', 'fire os', 'tizen'
    ],
    browser: [
        'chrome', 'safari', 'firefox', 'edge', 'opera',
        'samsung browser', 'uc browser', 'brave', 'vivaldi',
        'yandex browser', 'whale', 'duckduckgo'
    ],
    device: [
        'iphone', 'ipad', 'samsung', 'xiaomi', 'huawei',
        'oppo', 'vivo', 'oneplus', 'google pixel', 'sony',
        'lg', 'motorola', 'nokia', 'realme', 'asus'
    ]
};

export const SYSTEM_PROMPT = `
# Role
You are a senior AdTech Data Scientist and Market Analyst. Your task is to generate a daily "Market Script" for an ad traffic simulation engine.

# Objective
Based on the provided Date, Active Campaigns, and Targeting Rules, generate a JSON configuration that controls the simulation's probability models (CTR/CVR) and generates a pool of realistic User Profiles.

# Constraints & Logic Rules
1. **Strict Enums**: You MUST use ONLY the provided enum values for targeting fields.
   - Countries: ${TARGETING_ENUMS.countries.join(', ')}
   - OS: ${TARGETING_ENUMS.os.join(', ')}
   - Browser: ${TARGETING_ENUMS.browser.join(', ')}
   - Device: ${TARGETING_ENUMS.device.join(', ')}

2. **Logical Consistency**:
   - **OS/Device**: 'iphone'/'ipad' MUST imply 'ios'. 'mac' MUST imply 'macos'.
   - **Browser/OS**: 'safari' is ONLY for 'macos' or 'ios'. 'edge' is primarily for 'windows' (but allowed on others).
   - **Geo**: 'New York' -> 'US', 'Beijing' -> 'CN', etc.
   - **Market Share**: 
     - Mobile (Android/iOS) should generally outnumber Desktop.
     - Chrome has the highest browser share globally.
     - Safari has high share in US/JP/UK.

3. **Campaign Matching**:
5. **Traffic Trends**:
   - Instead of generating individual users, you will define **Trend Multipliers**.
   - If the story implies high mobile usage, boost 'os:android'/'os:ios'.
   - If the story focuses on a specific region (e.g. 'Japan Tech Week'), boost 'country:JP'.

# Output Format
You must output a JSON object adhering to the schema defined in the API call.
Do NOT generate the 'target_pool' array. It will be generated programmatically based on your trends.
`;

export const USER_PROMPT_TEMPLATE = (date: string, campaigns: any[]) => `
# Context
- **Date**: ${date}
- **Active Campaigns**:
${JSON.stringify(campaigns, null, 2)}

# Task
# Task
Generate the daily market script for this date. ensuring the scenario matches the date (seasonality, day of week, holidays).
You MUST populate 'traffic_trends' with meaningful multipliers based on the story.
Example:
"traffic_trends": {
    "country_weights": [ { "code": "CN", "weight": 1.5 }, { "code": "US", "weight": 0.8 } ],
    "os_weights": [ { "name": "ios", "weight": 1.2 } ],
    "browser_weights": []
}
Do NOT generate 'target_pool'.
`;

export const MARKET_SCRIPT_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        scenario_name: { type: SchemaType.STRING, description: "Theme of the day" },
        strategy_summary: { type: SchemaType.STRING, description: "Brief explanation of the market conditions" },
        feature_modifiers: {
            type: SchemaType.OBJECT,
            description: "CTR/CVR modifiers (e.g., 'os:ios': 1.2)",
        },
        traffic_trends: {
            type: SchemaType.OBJECT,
            description: "Traffic volume multipliers based on the story.",
            properties: {
                country_weights: {
                    type: SchemaType.ARRAY,
                    description: "List of countries with non-default weights",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            code: { type: SchemaType.STRING, description: "Country Code (e.g. CN, US)" },
                            weight: { type: SchemaType.NUMBER, description: "Multiplier (0.5 - 2.0)" }
                        },
                        required: ["code", "weight"]
                    }
                },
                os_weights: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING, description: "OS Name (e.g. ios, android)" },
                            weight: { type: SchemaType.NUMBER }
                        },
                        required: ["name", "weight"]
                    }
                },
                browser_weights: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING },
                            weight: { type: SchemaType.NUMBER }
                        },
                        required: ["name", "weight"]
                    }
                }
            },
            required: ["country_weights", "os_weights", "browser_weights"]
        }
    },
    required: ["scenario_name", "strategy_summary", "traffic_trends"]
};
