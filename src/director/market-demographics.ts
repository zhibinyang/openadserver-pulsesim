export const MARKET_DEMOGRAPHICS = {
    // Approximate Internet Population / Ad Traffic Share (Simple Baseline)
    countries: {
        'US': 0.20,
        'CN': 0.18,
        'IN': 0.12,
        'JP': 0.05,
        'GB': 0.04,
        'DE': 0.03,
        'BR': 0.03,
        'FR': 0.03,
        'KR': 0.02,
        'SG': 0.01,
        // Long tail handled by 'Others' or normalized
    },
    // Global OS Market Share
    os: {
        'android': 0.45,
        'ios': 0.25,
        'windows': 0.20,
        'macos': 0.08,
        'linux': 0.02
    },
    // Global Browser Market Share
    browser: {
        'chrome': 0.60,
        'safari': 0.20,
        'edge': 0.10,
        'firefox': 0.05,
        'opera': 0.03,
        'uc browser': 0.02 // Popular in Asia
    }
};

// Device logic: 
// android -> samsung, pixel, xiaomi, etc.
// ios -> iphone, ipad
// windows -> asus, dell, etc.
// macos -> macbook
export const DEVICE_MAPPING: Record<string, string[]> = {
    'android': ['samsung', 'xiaomi', 'huawei', 'oppo', 'vivo', 'google pixel', 'oneplus', 'sony', 'motorola'],
    'ios': ['iphone', 'ipad'],
    'windows': ['dell', 'hp', 'lenovo', 'asus', 'acer'],
    'macos': ['macbook', 'imac'],
    'linux': ['thinkpad', 'dell'] // Generic
};
