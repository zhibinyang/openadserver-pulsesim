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
   - The generated 'target_pool' (User Profiles) MUST be designed to hit the Active Campaigns.
   - Ensure a good mix of profiles that match and do NOT match specific campaigns to test filtering.

4. **Multipliers**:
   - 'feature_modifiers' control the CTR bias. Values should be in range [0.5, 3.0].
   - If today is a special event (e.g., 'Black Friday'), boost relevant shopping features.

# Output Format
You must output a JSON object adhering to the schema defined in the API call.
`;

export const USER_PROMPT_TEMPLATE = (date: string, campaigns: any[]) => `
# Context
- **Date**: ${date}
- **Active Campaigns**:
${JSON.stringify(campaigns, null, 2)}

# Task
Generate the daily market script for this date. ensuring the scenario matches the date (seasonality, day of week, holidays).
Generate 20 User Profiles in the 'target_pool'.
`;

export const MARKET_SCRIPT_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        scenario_name: { type: SchemaType.STRING, description: "Theme of the day (e.g., 'Cyber Monday Pre-warm')" },
        strategy_summary: { type: SchemaType.STRING, description: "Brief explanation of the market conditions" },
        feature_modifiers: {
            type: SchemaType.OBJECT,
            description: "Key-value pairs for CTR multipliers (e.g., 'os:ios': 1.2)",
        },
        target_pool: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    user_id: { type: SchemaType.STRING },
                    slot_id: { type: SchemaType.STRING },
                    slot_type: { type: SchemaType.NUMBER, description: "1=Banner, 2=Native, 3=Video, 4=Interstitial" },
                    ip: { type: SchemaType.STRING },
                    country: { type: SchemaType.STRING, enum: TARGETING_ENUMS.countries },
                    city: { type: SchemaType.STRING },
                    os: { type: SchemaType.STRING, enum: TARGETING_ENUMS.os },
                    browser: { type: SchemaType.STRING, enum: TARGETING_ENUMS.browser },
                    device: { type: SchemaType.STRING, enum: TARGETING_ENUMS.device },
                    app_id: { type: SchemaType.STRING },
                    age: { type: SchemaType.NUMBER },
                    gender: { type: SchemaType.STRING, enum: ["M", "F", "O"] },
                    interests: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    page_context: { type: SchemaType.STRING }
                },
                required: ["user_id", "slot_id", "country", "os", "browser", "device"]
            }
        }
    },
    required: ["scenario_name", "strategy_summary", "feature_modifiers", "target_pool"]
};
