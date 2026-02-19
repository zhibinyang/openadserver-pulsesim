export interface TargetingRule {
    rule_type: string;
    rule_value: {
        countries?: string[];
        [key: string]: any;
    };
    is_include: boolean;
}

export interface Campaign {
    id: number;
    advertiser_id: number;
    name: string;
    description: string | null;
    budget_daily: string;
    budget_total: string;
    spent_today: string;
    spent_total: string;
    bid_type: number;
    bid_amount: string;
    freq_cap_daily: number;
    freq_cap_hourly: number;
    start_time: string | null;
    end_time: string | null;
    status: number;
    is_active: boolean;
    impressions: number;
    clicks: number;
    conversions: number;
    created_at: string;
    updated_at: string;
}

export interface Targeting {
    id: number;
    campaign_id: number;
    rule_type: string;
    rule_value: {
        countries?: string[];
        [key: string]: any;
    };
    is_include: boolean;
    created_at: string;
    updated_at: string;
    campaign: Campaign;
}
