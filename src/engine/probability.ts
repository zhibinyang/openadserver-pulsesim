export class ProbabilityEngine {
    private static instance: ProbabilityEngine;

    // Baselines
    private readonly BASE_CTR = 0.01; // 1% Base CTR
    private readonly BASE_CVR = 0.05; // 5% CVR after click

    // Slot Biases (CTR Multipliers)
    public readonly SLOT_BIASES: Record<string, number> = {
        'slot_hero_top': 5.0,      // 页面核心位置，点击率是平均值的 5 倍 (5%)
        'slot_in_article': 3.5,    // 原生内容位置，用户参与度高 (3.5%)
        'slot_feed_native': 2.5,   // 模拟社交/新闻信息流，接受度好 (2.5%)
        'slot_interstitial': 8.0,  // 强曝光插屏，最高点击率，但也容易导致误触 (8%)
        'slot_sidebar': 1.0,       // 基准位，作为 1.0 的参照系数 (1%)
        'slot_footer_fixed': 0.6   // 视觉盲区，点击率低于平均水平 (0.6%)
    };

    private constructor() { }

    public static getInstance(): ProbabilityEngine {
        if (!ProbabilityEngine.instance) {
            ProbabilityEngine.instance = new ProbabilityEngine();
        }
        return ProbabilityEngine.instance;
    }

    /**
     * Determine if a click should occur.
     * @param userProfile The user profile context
     * @param scriptModifiers Modifiers from daily_script.json
     */
    public shouldClick(userProfile: any, scriptModifiers: Record<string, number>): boolean {
        let probability = this.BASE_CTR;

        // Apply slot bias
        if (userProfile.slot_id && this.SLOT_BIASES[userProfile.slot_id]) {
            probability *= this.SLOT_BIASES[userProfile.slot_id];
        }

        // Apply script modifiers
        if (Array.isArray(scriptModifiers)) {
            // New format: [{ feature: "os:ios", weight: 1.5 }]
            for (const mod of scriptModifiers) {
                if (mod && mod.feature && mod.weight) {
                    const [field, value] = mod.feature.split(':');
                    if (userProfile[field] && String(userProfile[field]).toLowerCase() === String(value).toLowerCase()) {
                        probability *= mod.weight;
                    }
                }
            }
        } else if (typeof scriptModifiers === 'object' && scriptModifiers !== null) {
            // Old format: { "os:ios": 1.5 }
            for (const [key, multiplier] of Object.entries(scriptModifiers)) {
                const [field, value] = key.split(':');
                if (userProfile[field] && String(userProfile[field]).toLowerCase() === String(value).toLowerCase()) {
                    probability *= multiplier as number;
                }
            }
        }

        probability = Math.min(Math.max(probability, 0), 1);
        const roll = Math.random();
        const result = roll < probability;

        if (result) {
            console.log(`[Probability] Click WIN! (slot=${userProfile.slot_id}, p=${probability.toFixed(4)}, roll=${roll.toFixed(4)})`);
        }

        return result;
    }

    public shouldConvert(userProfile: any, scriptModifiers: Record<string, number>): boolean {
        let probability = this.BASE_CVR;

        // Apply slot bias to CVR (Optional, but interstitial might have lower true intent CVR)
        if (userProfile.slot_id === 'slot_interstitial') {
            probability *= 0.5; // High misclick rate means lower actual CVR
        } else if (userProfile.slot_id === 'slot_in_article') {
            probability *= 1.2; // High intent
        }

        if (userProfile.interests && userProfile.interests.includes('shopping')) {
            probability *= 1.5;
        }

        const roll = Math.random();
        const result = roll < probability;

        if (result) {
            console.log(`[Probability] Conversion WIN! (p=${probability.toFixed(4)}, roll=${roll.toFixed(4)})`);
        }

        return result;
    }
}
