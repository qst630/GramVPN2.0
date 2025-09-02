import { supabase } from '../lib/supabase';
import { User, UserStats, SubscriptionPlan } from '../types/vpn';

class DirectSupabaseService {
  private isMockMode: boolean;
  private mockUsers: Map<number, User> = new Map();

  constructor() {
    // Check if Supabase is configured
    this.isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
    console.log('🔧 DirectSupabaseService initialized:', {
      mockMode: this.isMockMode,
      hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      mode: this.isMockMode ? '🧪 Mock Mode' : '🌐 Direct Supabase'
    });
  }

  // Generate unique referral code
  private generateReferralCode(telegramId: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `REF${telegramId}_${timestamp}${random}`.toUpperCase();
  }

  async getOrCreateUser(telegramUser: any, referralCode?: string): Promise<User> {
    console.log('👤 Getting or creating user:', telegramUser.first_name, 'ID:', telegramUser.id);
    
    if (this.isMockMode) {
      return this.mockGetOrCreateUser(telegramUser, referralCode);
    }

    try {
      // Try to get existing user
      console.log('🔍 Checking for existing user...');
      const { data: existingUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUser.id)
        .single();

      if (getUserError && getUserError.code !== 'PGRST116') {
        console.error('❌ Error getting user:', getUserError);
        throw getUserError;
      }

      if (existingUser) {
        console.log('✅ User found:', existingUser.referral_code);
        return existingUser;
      }

      // Create new user
      console.log('👤 Creating new user...');
      const newReferralCode = this.generateReferralCode(telegramUser.id);
      
      // Find referrer if referral code provided
      let referrerId = null;
      if (referralCode) {
        console.log('🎫 Looking for referrer with code:', referralCode);
        const { data: referrer } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', referralCode)
          .single();
        
        if (referrer) {
          referrerId = referrer.id;
          console.log('✅ Referrer found:', referrerId);
        }
      }

      const userData = {
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        referral_code: newReferralCode,
        referred_by: referrerId,
        subscription_status: false
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        throw createError;
      }

      console.log('✅ User created:', newUser.referral_code);

      // Process referral bonus if applicable
      if (referrerId) {
        console.log('🎁 Adding referral bonus...');
        await supabase
          .from('referral_bonuses')
          .insert({
            referrer_id: referrerId,
            referred_id: newUser.id,
            bonus_days: 7
          });
      }

      return newUser;

    } catch (error) {
      console.error('❌ Error in getOrCreateUser:', error);
      
      // Fallback to mock mode on error
      console.log('🔄 Falling back to mock mode');
      this.isMockMode = true;
      return this.mockGetOrCreateUser(telegramUser, referralCode);
    }
  }

  async startTrial(telegramId: number): Promise<{ user: User; subscription: any; server: string }> {
    console.log('🎯 Starting trial for user:', telegramId);
    
    if (this.isMockMode) {
      return this.mockStartTrial(telegramId);
    }

    try {
      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, subscription_status')
        .eq('telegram_id', telegramId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Check if user already has subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSubscription) {
        throw new Error('User already has a subscription');
      }

      // Create trial subscription
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          subscription_type: 'trial',
          end_date: trialEndDate.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (subError) throw subError;

      // Update user status
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: true,
          subscription_link: 'v2ray://eyJzZXJ2ZXIiOiJubDEuZ3JhbXZwbi5jb20iLCJwb3J0Ijo0NDN9'
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        user: updatedUser,
        subscription,
        server: 'Netherlands'
      };

    } catch (error) {
      console.error('❌ Error starting trial:', error);
      
      // Fallback to mock mode
      this.isMockMode = true;
      return this.mockStartTrial(telegramId);
    }
  }

  async getUserStatus(telegramId: number): Promise<{
    user: User | null;
    subscription_type: string | null;
    days_remaining: number;
    has_active_subscription: boolean;
  }> {
    console.log('📊 Getting user status for:', telegramId);
    
    if (this.isMockMode) {
      return this.mockGetUserStatus(telegramId);
    }

    try {
      // Get user with active subscription
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          *,
          subscriptions!inner(
            subscription_type,
            start_date,
            end_date,
            is_active
          )
        `)
        .eq('telegram_id', telegramId)
        .eq('subscriptions.is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Calculate days remaining
      let daysRemaining = 0;
      let subscriptionType = null;
      
      if (user && user.subscriptions && user.subscriptions.length > 0) {
        const subscription = user.subscriptions[0];
        const endDate = new Date(subscription.end_date);
        const now = new Date();
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        subscriptionType = subscription.subscription_type;
      }

      return {
        user,
        subscription_type: subscriptionType,
        days_remaining: daysRemaining,
        has_active_subscription: daysRemaining > 0
      };

    } catch (error) {
      console.error('❌ Error getting user status:', error);
      
      // Fallback to mock mode
      this.isMockMode = true;
      return this.mockGetUserStatus(telegramId);
    }
  }

  async getReferralStats(telegramId: number): Promise<{ referrals_count: number; bonus_days_earned: number }> {
    console.log('📈 Getting referral stats for:', telegramId);
    
    if (this.isMockMode) {
      return { referrals_count: 2, bonus_days_earned: 14 };
    }

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Get referral count
      const { count: referralCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('referred_by', user.id);

      // Get bonus days earned
      const { data: bonuses } = await supabase
        .from('referral_bonuses')
        .select('bonus_days')
        .eq('referrer_id', user.id);

      const totalBonusDays = bonuses?.reduce((sum, bonus) => sum + bonus.bonus_days, 0) || 0;

      return {
        referrals_count: referralCount || 0,
        bonus_days_earned: totalBonusDays
      };

    } catch (error) {
      console.error('❌ Error getting referral stats:', error);
      return { referrals_count: 0, bonus_days_earned: 0 };
    }
  }

  async validatePromoCode(code: string): Promise<{ valid: boolean; promo_code?: any; error?: string }> {
    console.log('🎫 Validating promo code:', code);
    
    if (this.isMockMode) {
      return this.mockValidatePromoCode(code);
    }

    try {
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promoCode) {
        return { valid: false, error: 'Промокод не найден или неактивен' };
      }

      // Check expiration
      if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
        return { valid: false, error: 'Промокод истек' };
      }

      // Check usage limit
      if (promoCode.max_usage && promoCode.usage_count >= promoCode.max_usage) {
        return { valid: false, error: 'Промокод исчерпан' };
      }

      return { valid: true, promo_code: promoCode };

    } catch (error) {
      console.error('❌ Error validating promo code:', error);
      return { valid: false, error: 'Ошибка проверки промокода' };
    }
  }

  async createSubscription(
    telegramId: number, 
    subscriptionType: string, 
    paymentAmount: number, 
    promoCode?: string
  ): Promise<{ success: boolean; subscription: any; message: string }> {
    console.log('💳 Creating subscription:', { telegramId, subscriptionType, paymentAmount, promoCode });
    
    if (this.isMockMode) {
      return this.mockCreateSubscription(telegramId, subscriptionType);
    }

    try {
      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Calculate subscription duration
      const daysMap = {
        '30days': 30,
        '90days': 90,
        '365days': 365
      };

      const days = daysMap[subscriptionType as keyof typeof daysMap];
      if (!days) {
        throw new Error('Invalid subscription type');
      }

      // Create subscription
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          subscription_type,
          end_date: endDate.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: paymentAmount,
          payment_method: 'yoomoney',
          subscription_id: subscription.id,
          promo_code_used: promoCode
        });

      // Update user status
      await supabase
        .from('users')
        .update({
          subscription_status: true,
          subscription_link: 'v2ray://eyJzZXJ2ZXIiOiJubDEuZ3JhbXZwbi5jb20iLCJwb3J0Ijo0NDN9'
        })
        .eq('id', user.id);

      return {
        success: true,
        subscription,
        message: 'Подписка успешно создана'
      };

    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      throw error;
    }
  }

  // Subscription plans configuration
  getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        type: '30days',
        name: '30 дней',
        days: 30,
        price: 150,
        monthlyPrice: 150
      },
      {
        type: '90days',
        name: '90 дней',
        days: 90,
        price: 350,
        monthlyPrice: 117,
        popular: true,
        discount: 'Экономия 100 ₽'
      },
      {
        type: '365days',
        name: '365 дней',
        days: 365,
        price: 1100,
        monthlyPrice: 92,
        discount: 'Экономия 1730 ₽'
      }
    ];
  }

  // Test connection to Supabase
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (this.isMockMode) {
      return { success: false, error: 'Supabase not configured - running in mock mode' };
    }

    try {
      console.log('🧪 Testing direct Supabase connection...');
      
      // Test 1: Basic API connectivity
      console.log('📡 Step 1: Testing API endpoint...');
      const healthResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      console.log('📡 API Response:', healthResponse.status, healthResponse.statusText);
      
      if (!healthResponse.ok) {
        throw new Error(`API not accessible: ${healthResponse.status} ${healthResponse.statusText}`);
      }
      
      // Test 2: Check if users table exists
      console.log('🗄️ Step 2: Testing users table...');
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      console.log('🗄️ Table query result:', { hasData: data !== null, error: error?.message, errorCode: error?.code });

      if (error) {
        if (error.code === '42P01') {
          return { 
            success: false, 
            error: 'Database tables not found. Please run migrations in Supabase Dashboard → SQL Editor.' 
          };
        }
        
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }

      console.log('✅ Supabase connection successful');
      return { success: true };

    } catch (error) {
      console.error('❌ Connection test error:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Network error: Cannot reach Supabase. Check URL and internet connection.' 
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Mock methods for development
  private async mockGetOrCreateUser(telegramUser: any, referralCode?: string): Promise<User> {
    const { telegram_id, username, first_name, last_name } = telegramUser;
    
    let user = this.mockUsers.get(telegram_id);
    
    if (!user) {
      user = {
        id: Date.now(),
        telegram_id,
        username,
        full_name: `${first_name} ${last_name || ''}`.trim(),
        referral_code: this.generateReferralCode(telegram_id),
        referred_by: referralCode ? 1 : undefined,
        subscription_status: false,
        subscription_link: undefined,
        created_at: new Date().toISOString()
      };
      
      this.mockUsers.set(telegram_id, user);
      console.log('🧪 Mock user created:', user.referral_code);
    }
    
    return user;
  }

  private async mockStartTrial(telegramId: number): Promise<any> {
    const user = this.mockUsers.get(telegramId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      subscription_status: true,
      subscription_link: 'v2ray://eyJzZXJ2ZXIiOiJubDEuZ3JhbXZwbi5jb20iLCJwb3J0Ijo0NDN9'
    };

    this.mockUsers.set(telegramId, updatedUser);

    const subscription = {
      id: Date.now(),
      user_id: user.id,
      subscription_type: 'trial' as const,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    console.log('🧪 Mock trial started');
    return {
      user: updatedUser,
      subscription,
      server: 'Netherlands'
    };
  }

  private async mockGetUserStatus(telegramId: number): Promise<any> {
    const user = this.mockUsers.get(telegramId);
    
    if (!user) {
      return {
        user: null,
        subscription_type: null,
        days_remaining: 0,
        has_active_subscription: false
      };
    }

    return {
      user,
      subscription_type: user.subscription_status ? 'trial' : null,
      days_remaining: user.subscription_status ? 2 : 0,
      has_active_subscription: user.subscription_status
    };
  }

  private mockValidatePromoCode(code: string): { valid: boolean; promo_code?: any; error?: string } {
    if (code.toUpperCase() === 'WELCOME30') {
      return {
        valid: true,
        promo_code: {
          id: 1,
          code: 'WELCOME30',
          discount_percent: 30,
          valid_for: 'all',
          is_active: true,
          is_one_time: false,
          usage_count: 0,
          created_at: new Date().toISOString()
        }
      };
    }
    
    return { valid: false, error: 'Промокод не найден (режим разработки)' };
  }

  private async mockCreateSubscription(telegramId: number, subscriptionType: string): Promise<any> {
    return {
      success: true,
      subscription: {
        id: Date.now(),
        user_id: Date.now(),
        subscription_type: subscriptionType,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      },
      message: 'Подписка успешно создана (режим разработки)'
    };
  }
}

export const directSupabaseService = new DirectSupabaseService();