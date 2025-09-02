export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          telegram_id: number;
          first_name: string;
          last_name: string | null;
          username: string | null;
          free_trial_used: boolean;
          free_trial_started_at: string | null;
          free_trial_expires_at: string | null;
          subscription_active: boolean;
          subscription_expires_at: string | null;
          referral_code: string;
          referred_by: string | null;
          total_referrals: number;
          bonus_days_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          telegram_id: number;
          first_name: string;
          last_name?: string | null;
          username?: string | null;
          free_trial_used?: boolean;
          free_trial_started_at?: string | null;
          free_trial_expires_at?: string | null;
          subscription_active?: boolean;
          subscription_expires_at?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          total_referrals?: number;
          bonus_days_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          telegram_id?: number;
          first_name?: string;
          last_name?: string | null;
          username?: string | null;
          free_trial_used?: boolean;
          free_trial_started_at?: string | null;
          free_trial_expires_at?: string | null;
          subscription_active?: boolean;
          subscription_expires_at?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          total_referrals?: number;
          bonus_days_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      marketing_campaigns: {
        Row: {
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
        };
        Insert: {
          id?: number;
          name: string;
          type: 'discount' | 'bonus_days' | 'referral_bonus';
          value: number;
          code?: string | null;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          current_uses?: number;
          target_audience?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          type?: 'discount' | 'bonus_days' | 'referral_bonus';
          value?: number;
          code?: string | null;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          current_uses?: number;
          target_audience?: string | null;
          created_at?: string;
        };
      };
      promo_code_usage: {
        Row: {
          id: number;
          user_id: number;
          campaign_id: number;
          code_used: string;
          discount_applied: number;
          bonus_days_added: number;
          used_at: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          campaign_id: number;
          code_used: string;
          discount_applied?: number;
          bonus_days_added?: number;
          used_at?: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          campaign_id?: number;
          code_used?: string;
          discount_applied?: number;
          bonus_days_added?: number;
          used_at?: string;
        };
      };
    };
  };
}