export interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  free_trial_used: boolean;
  free_trial_started_at?: string;
  free_trial_expires_at?: string;
  subscription_active: boolean;
  subscription_expires_at?: string;
  referral_code: string;
  referred_by?: string | null;
  total_referrals: number;
  bonus_days_earned: number;
  created_at: string;
  updated_at: string;
}

export interface FreeTrialStatus {
  available: boolean;
  used: boolean;
  active: boolean;
  expires_at?: string;
  days_remaining?: number;
}

export interface MarketingCampaign {
  id: number;
  name: string;
  type: 'discount' | 'bonus_days' | 'referral_bonus';
  value: number;
  code: string | null;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  target_audience: string | null;
  created_at: string;
}

export interface PromoCodeValidation {
  valid: boolean;
  campaign?: MarketingCampaign;
  error?: string;
}