import { User, Subscription, Server, PromoCode, UserStats, SubscriptionPlan } from '../types/vpn';

const VPN_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vpn-management`;

class VPNService {
  private isMockMode: boolean;
  private mockUsers: Map<number, User> = new Map();

  constructor() {
    // Check if Supabase is configured
    this.isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
    console.log('🔧 VPNService initialized:', {
      mockMode: this.isMockMode,
      hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      mode: this.isMockMode ? '🧪 Mock Mode' : '🌐 Real VPN Service',
      functionUrl: VPN_FUNCTION_URL
    });
  }

  private async callVPNFunction(action: string, payload: any): Promise<any> {
    // If already in mock mode, handle immediately
    if (this.isMockMode) {
      console.log('🧪 Already in mock mode, handling request locally');
      return this.handleMockRequest(action, payload);
    }

    // Check if we have required environment variables
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('⚠️ Missing Supabase config, switching to mock mode');
      this.isMockMode = true;
      return this.handleMockRequest(action, payload);
    }

    console.log('🌐 Calling VPN Function:', action, 'URL:', VPN_FUNCTION_URL);
    console.log('📡 Payload:', payload);
    console.log('🔑 Has Auth Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

    try {
      // First, test if the function exists with a simple OPTIONS request
      console.log('🔍 Testing function availability...');
      const optionsResponse = await fetch(VPN_FUNCTION_URL, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type, authorization'
        }
      });
      
      console.log('📡 OPTIONS response:', optionsResponse.status, optionsResponse.statusText);
      
      if (!optionsResponse.ok) {
        throw new Error(`Function not available: ${optionsResponse.status} ${optionsResponse.statusText}`);
      }

      // Now make the actual request
      const response = await fetch(VPN_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-client-info': 'gramvpn-webapp/1.0.0',
        },
        body: JSON.stringify({ action, ...payload })
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.log('📡 Error response body:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.error || 'VPN service error');
      }

      const result = await response.json();
      console.log('✅ VPN Function response:', result);
      return result;
    } catch (error) {
      console.error('VPN service error:', error);
      
      // Check for various error conditions that indicate function is not available
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (
        error instanceof TypeError && errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('CORS') ||
        errorMessage.includes('404') ||
        errorMessage.includes('Not Found') ||
        errorMessage.includes('Function not available')
      ) {
        console.log('🚨 VPN Function not available, falling back to mock mode');
        console.log('💡 This usually means the Edge Function is not deployed');
        this.isMockMode = true;
        return this.handleMockRequest(action, payload);
      }
      
      throw error;
    }
  }

  async getOrCreateUser(telegramUser: any, referralCode?: string): Promise<User> {
    console.log('👤 Getting or creating user:', telegramUser.first_name, 'ID:', telegramUser.id);
    
    const result = await this.callVPNFunction('get_or_create_user', {
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
      referral_code: referralCode
    });

    return result.user;
  }

  async startTrial(telegramId: number): Promise<{ user: User; subscription: Subscription; server: string }> {
    console.log('🎯 Starting trial for user:', telegramId);
    
    const result = await this.callVPNFunction('start_trial', {
      telegram_id: telegramId
    });

    return result;
  }

  async getUserStatus(telegramId: number): Promise<{
    user: User | null;
    subscription_type: string | null;
    days_remaining: number;
    has_active_subscription: boolean;
  }> {
    console.log('📊 Getting user status for:', telegramId);
    
    const result = await this.callVPNFunction('get_user_status', {
      telegram_id: telegramId
    });

    return result;
  }

  async getReferralStats(telegramId: number): Promise<{ referrals_count: number; bonus_days_earned: number }> {
    console.log('📈 Getting referral stats for:', telegramId);
    
    const result = await this.callVPNFunction('get_referral_stats', {
      telegram_id: telegramId
    });

    return result;
  }

  async validatePromoCode(code: string): Promise<{ valid: boolean; promo_code?: PromoCode; error?: string }> {
    console.log('🎫 Validating promo code:', code);
    
    const result = await this.callVPNFunction('validate_promo_code', {
      code: code
    });

    return result;
  }

  async createSubscription(
    telegramId: number, 
    subscriptionType: string, 
    paymentAmount: number, 
    promoCode?: string
  ): Promise<{ success: boolean; subscription: Subscription; message: string }> {
    console.log('💳 Creating subscription:', { telegramId, subscriptionType, paymentAmount, promoCode });
    
    const result = await this.callVPNFunction('create_subscription', {
      telegram_id: telegramId,
      subscription_type: subscriptionType,
      payment_amount: paymentAmount,
      promo_code: promoCode
    });

    return result;
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

  // Mock methods for development
  private async handleMockRequest(action: string, payload: any): Promise<any> {
    console.log('🧪 Mock VPN request:', action, payload);
    
    switch (action) {
      case 'get_or_create_user':
        return this.mockGetOrCreateUser(payload);
      case 'start_trial':
        return this.mockStartTrial(payload);
      case 'get_user_status':
        return this.mockGetUserStatus(payload);
      case 'get_referral_stats':
        return { referrals_count: 2, bonus_days_earned: 14 };
      case 'validate_promo_code':
        return this.mockValidatePromoCode(payload);
      case 'create_subscription':
        return this.mockCreateSubscription(payload);
      default:
        throw new Error(`Unknown mock action: ${action}`);
    }
  }

  private async mockGetOrCreateUser(payload: any): Promise<{ user: User }> {
    const { telegram_id, username, full_name, referral_code } = payload;
    
    let user = this.mockUsers.get(telegram_id);
    
    if (!user) {
      user = {
        id: Date.now(),
        telegram_id,
        username,
        full_name,
        referral_code: `REF${telegram_id}_${Date.now()}`,
        referred_by: referral_code ? 1 : undefined,
        subscription_status: false,
        subscription_link: undefined,
        created_at: new Date().toISOString()
      };
      
      this.mockUsers.set(telegram_id, user);
    }
    
    return { user };
  }

  private async mockStartTrial(payload: any): Promise<any> {
    const { telegram_id } = payload;
    const user = this.mockUsers.get(telegram_id);
    
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      subscription_status: true,
      subscription_link: 'v2ray://eyJzZXJ2ZXIiOiJubDEuZ3JhbXZwbi5jb20iLCJwb3J0Ijo0NDN9'
    };

    this.mockUsers.set(telegram_id, updatedUser);

    const subscription = {
      id: Date.now(),
      user_id: user.id,
      subscription_type: 'trial' as const,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    return {
      user: updatedUser,
      subscription,
      server: 'Netherlands'
    };
  }

  private async mockGetUserStatus(payload: any): Promise<any> {
    const { telegram_id } = payload;
    const user = this.mockUsers.get(telegram_id);
    
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

  private async mockValidatePromoCode(payload: any): Promise<any> {
    const { code } = payload;
    
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

  private async mockCreateSubscription(payload: any): Promise<any> {
    const { telegram_id, subscription_type } = payload;
    
    return {
      success: true,
      subscription: {
        id: Date.now(),
        user_id: Date.now(),
        subscription_type,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      },
      message: 'Подписка успешно создана (режим разработки)'
    };
  }
}

export const vpnService = new VPNService();