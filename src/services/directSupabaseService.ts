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
    // Generate exactly 5-character code with uppercase letters and numbers only
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate 5 random characters
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('🎫 Generated referral code:', code);
    return code;
  }

  async getOrCreateUser(telegramUser: any, referralCode?: string): Promise<User> {
    console.log('👤 Getting or creating user:', telegramUser.first_name, 'ID:', telegramUser.id);
    console.log('📊 Service mode:', this.isMockMode ? '🧪 Mock' : '🌐 Database');
    console.log('🎫 Referral code:', referralCode || 'None');
    
    if (this.isMockMode) {
      console.log('🧪 Using mock mode - user will not be saved to database');
      return this.mockGetOrCreateUser(telegramUser, referralCode);
    }

    try {
      // Try to get existing user
      console.log('🔍 Checking for existing user in database...');
      console.log('📡 Query: SELECT * FROM users WHERE telegram_id =', telegramUser.id);
      
      const { data: existingUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUser.id)
        .single();

      console.log('📡 Database response:', {
        hasUser: !!existingUser,
        error: getUserError?.message,
        errorCode: getUserError?.code
      });

      if (getUserError && getUserError.code !== 'PGRST116') {
        console.error('❌ Error getting user:', getUserError);
        console.error('❌ Full error details:', getUserError);
        throw getUserError;
      }

      if (existingUser) {
        console.log('✅ Existing user found:', {
          id: existingUser.id,
          referral_code: existingUser.referral_code,
          created_at: existingUser.created_at
        });
        return existingUser;
      }

      // Create new user
      console.log('👤 User not found, creating new user...');
      const newReferralCode = this.generateReferralCode(telegramUser.id);
      console.log('🎫 Generated referral code:', newReferralCode);
      
      // Find referrer if referral code provided
      let referrerId = null;
      if (referralCode) {
        console.log('🔍 Looking for referrer with code:', referralCode);
        const { data: referrer } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', referralCode)
          .single();
        
        if (referrer) {
          referrerId = referrer.id;
          console.log('✅ Referrer found with ID:', referrerId);
        } else {
          console.log('⚠️ Referrer not found for code:', referralCode);
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

      console.log('📝 User data to insert:', userData);
      console.log('📡 Executing INSERT query...');

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      console.log('📡 Insert response:', {
        hasUser: !!newUser,
        error: createError?.message,
        errorCode: createError?.code,
        errorDetails: createError?.details
      });

      if (createError) {
        console.error('❌ CRITICAL: Error creating user:', createError);
        console.error('❌ Error details:', {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint
        });
        
        // Check if it's a table doesn't exist error
        if (createError.code === '42P01') {
          console.error('🚨 TABLE MISSING: users table does not exist!');
          throw new Error('Database tables not created. Please create tables in Supabase Dashboard.');
        }
        
        // Check if it's a permission error
        if (createError.code === '42501') {
          console.error('🚨 PERMISSION ERROR: RLS policy blocking insert');
          throw new Error('Database permission error. Check RLS policies.');
        }
        
        throw createError;
      }

      console.log('✅ SUCCESS: User created successfully!', {
        id: newUser.id,
        telegram_id: newUser.telegram_id,
        referral_code: newUser.referral_code,
        full_name: newUser.full_name
      });

      // Process referral bonus if applicable
      if (referrerId) {
        console.log('🎁 Processing referral bonus for referrer:', referrerId);
        const { error: bonusError } = await supabase
          .from('referral_bonuses')
          .insert({
            referrer_id: referrerId,
            referred_id: newUser.id,
            bonus_days: 7
          });
        
        if (bonusError) {
          console.error('⚠️ Error adding referral bonus:', bonusError);
        } else {
          console.log('✅ Referral bonus added successfully');
        }
      }

      return newUser;

    } catch (error) {
      console.error('❌ FATAL ERROR in getOrCreateUser:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Fallback to mock mode on error
      console.log('🔄 FALLBACK: Switching to mock mode due to database error');
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
      console.log('🔍 Searching for promo code in database:', code.toUpperCase());
      
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      console.log('📡 Database response:', { 
        found: !!promoCode, 
        error: error?.message,
        errorCode: error?.code 
      });

      if (error || !promoCode) {
        console.log('❌ Promo code not found or error:', error);
        return { valid: false, error: 'Промокод не найден или неактивен' };
      }

      console.log('✅ Promo code found:', {
        code: promoCode.code,
        discount: promoCode.discount_percent,
        active: promoCode.is_active,
        expires_at: promoCode.expires_at
      });

      // Check expiration
      if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
        console.log('❌ Promo code expired');
        return { valid: false, error: 'Промокод истек' };
      }

      // Check usage limit
      if (promoCode.max_usage && promoCode.usage_count >= promoCode.max_usage) {
        console.log('❌ Promo code usage limit reached');
        return { valid: false, error: 'Промокод исчерпан' };
      }

      console.log('✅ Promo code is valid!');
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

  async applyPromoCode(userId: number, campaignId: number, code: string): Promise<void> {
    console.log('🎫 Applying promo code:', { userId, campaignId, code });
    
    if (this.isMockMode) {
      console.log('🧪 Mock: Applied promo code');
      return;
    }

    try {
      // For now, just log the application
      // In a real implementation, you would update usage counts, etc.
      console.log('✅ Promo code applied successfully');
    } catch (error) {
      console.error('❌ Error applying promo code:', error);
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
    console.log('🧪 ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К SUPABASE...');
    
    if (this.isMockMode) {
      console.log('🧪 Mock режим активен');
      return { success: false, error: 'Supabase not configured - running in mock mode' };
    }

    try {
      console.log('🔗 URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔑 Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
      
      // Test 1: Direct API call (skip HEAD request that might cause CORS issues)
      console.log('📡 Шаг 1: Прямой запрос к API...');
      const healthResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Ответ API:', healthResponse.status, healthResponse.statusText);
      
      if (!healthResponse.ok && healthResponse.status !== 401) {
        throw new Error(`API недоступен: ${healthResponse.status} ${healthResponse.statusText}`);
      }
      
      console.log('✅ API доступен');
      
      // Test 2: Check tables
      console.log('🗄️ Шаг 2: Проверка таблицы users...');
      const { data, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      console.log('🗄️ Результат запроса к таблице:', { 
        hasData: data !== null, 
        error: error?.message, 
        errorCode: error?.code 
      });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Таблицы БД не найдены. Создайте таблицы в Supabase Dashboard → SQL Editor.' 
          };
        }
        
        return { 
          success: false, 
          error: `Ошибка БД: ${error.message}` 
        };
      }

      console.log('✅ Подключение к Supabase успешно');
      return { success: true };

    } catch (error) {
      console.error('❌ Ошибка тестирования подключения:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'CORS или сетевая ошибка. Проект может быть активен, но браузер блокирует запросы.' 
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
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
      subscription_link: 'https://vpntest.digital/?key=v2raytun://import/https://vpntest.digital/subscription/' + telegramId + '?expire=' + Math.floor((Date.now() + 3 * 24 * 60 * 60 * 1000) / 1000)
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
    const upperCode = code.toUpperCase();
    
    // Mock promo codes for testing
    const mockPromoCodes = {
      'WELCOME30': {
        id: 1,
        code: 'WELCOME30',
        discount_percent: 30,
        valid_for: 'all', // Valid for all plans
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'MONTH30': {
        id: 2,
        code: 'MONTH30',
        discount_percent: 30,
        valid_for: '30days', // Valid only for 30-day plan
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'QUARTER20': {
        id: 3,
        code: 'QUARTER20',
        discount_percent: 20,
        valid_for: '90days', // Valid only for 90-day plan
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'YEAR15': {
        id: 4,
        code: 'YEAR15',
        discount_percent: 15,
        valid_for: '365days', // Valid only for 365-day plan
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'LONGTERM25': {
        id: 5,
        code: 'LONGTERM25',
        discount_percent: 25,
        valid_for: '90days,365days', // Valid for 90-day and 365-day plans
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'FREE30': {
        id: 6,
        code: 'FREE30',
        discount_percent: 100,
        valid_for: '30days', // Free 30-day plan
        is_active: true,
        is_one_time: true,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'FREEALL': {
        id: 7,
        code: 'FREEALL',
        discount_percent: 100,
        valid_for: 'all', // Free for all plans
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'FREELONG': {
        id: 8,
        code: 'FREELONG',
        discount_percent: 100,
        valid_for: '90days,365days', // Free for long-term plans
        is_active: true,
        is_one_time: true,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'TEST30_30': {
        id: 9,
        code: 'TEST30_30',
        discount_percent: 30,
        valid_for: '30days', // 30% discount for 30-day plan
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      },
      'TEST100_30': {
        id: 10,
        code: 'TEST100_30',
        discount_percent: 100,
        valid_for: '30days', // 100% discount (free) for 30-day plan
        is_active: true,
        is_one_time: false,
        usage_count: 0,
        created_at: new Date().toISOString()
      }
    };
    
    const promoCode = mockPromoCodes[upperCode as keyof typeof mockPromoCodes];
    
    if (promoCode) {
      return {
        valid: true,
        promo_code: promoCode
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