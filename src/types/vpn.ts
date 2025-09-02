export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  full_name: string;
  referral_code: string;
  referred_by?: number;
  subscription_status: boolean;
  subscription_link?: string;
  created_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  subscription_type: 'trial' | '30days' | '90days' | '365days';
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Server {
  id: number;
  server_name: string;
  server_ip: string;
  country: string;
  status: boolean;
  vless_domain?: string;
  vless_port?: number;
  server_port?: number;
  active_subscribers: number;
  server_role?: string;
}

export interface Payment {
  id: number;
  user_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  subscription_id?: number;
  promo_code_used?: string;
  discount_applied: number;
}

export interface PromoCode {
  id: number;
  code: string;
  discount_percent: number;
  valid_for: string;
  is_active: boolean;
  is_one_time: boolean;
  usage_count: number;
  max_usage?: number;
  created_at: string;
  expires_at?: string;
}

export interface ReferralBonus {
  id: number;
  referrer_id: number;
  referred_id: number;
  bonus_days: number;
  created_at: string;
  applied_at?: string;
}

export interface SubscriptionPlan {
  type: 'trial' | '30days' | '90days' | '365days';
  name: string;
  days: number;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  monthlyPrice?: number;
  popular?: boolean;
  discount?: string;
}

export interface UserStats {
  referrals_count: number;
  bonus_days_earned: number;
  total_payments: number;
  subscription_days_left: number;
}