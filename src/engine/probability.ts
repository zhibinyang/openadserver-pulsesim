export class ProbabilityEngine {
    private static instance: ProbabilityEngine;

    // Baselines
    private readonly BASE_CTR = 0.02; // 2% CTR
    private readonly BASE_CVR = 0.05; // 5% CVR after click

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

        // Apply modifiers
        // Example keys in modifiers: "os:ios", "country:US", "browser:chrome"
        for (const [key, multiplier] of Object.entries(scriptModifiers)) {
            const [field, value] = key.split(':');

            // Check if user profile matches the modifier key
            // e.g. if field is "os" and userProfile.os is "ios" -> apply match
            if (userProfile[field] && String(userProfile[field]).toLowerCase() === String(value).toLowerCase()) {
                probability *= multiplier;
            }
        }

        // Cap probability strictly between 0 and 1
        probability = Math.min(Math.max(probability, 0), 1);

        const roll = Math.random();
        const result = roll < probability;

        if (result) {
            console.log(`[Probability] Click WIN! (p=${probability.toFixed(4)}, roll=${roll.toFixed(4)})`);
        } else {
            // console.log(`[Probability] Click LOSS (p=${probability.toFixed(4)}, roll=${roll.toFixed(4)})`);
        }

        return result;
    }

    public shouldConvert(userProfile: any, scriptModifiers: Record<string, number>): boolean {
        // Similar logic for conversions, maybe simpler for now
        let probability = this.BASE_CVR;

        // Maybe boost high-intent users?
        if (userProfile.interests && userProfile.interests.includes('shopping')) {
            probability *= 1.5;
        }

        return Math.random() < probability;
    }
}
