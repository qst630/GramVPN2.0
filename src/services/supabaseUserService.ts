import { supabase } from '../lib/supabase';
import { User, FreeTrialStatus } from '../types/user';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`;

class SupabaseUserService {
  private isMockMode: boolean;
  private mockUsers: Map<number, User> = new Map();

  constructor() {
    this.isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
    console.log('🔧 UserService initialized:', {
      mockMode: this.isMockMode,
      hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      mode: this.isMockMode ? '🧪 Mock Mode' : '🌐 Real Database'
    });
  }

  // Generate unique referral code
  private generateReferralCode(telegramId: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${telegramId}-${timestamp}${random}`.toUpperCase();
  }

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    console.log('🔍 Getting user by Telegram ID:', telegramId);
    console.log('📊 Service mode:', this.isMockMode ? '🧪 Mock' : '🌐 Database');
    console.log('🔗 Edge Function URL:', EDGE_FUNCTION_URL);
    
    if (this.isMockMode) {
      console.log('🧪 Using mock data...');
      return this.mockGetUserByTelegramId(telegramId);
    }

    try {
      console.log('🌐 Calling secure Edge Function...');
      console.log('📡 Request details:', {
        url: EDGE_FUNCTION_URL,
        method: 'POST',
        hasAuth: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'get_user',
          telegram_id: telegramId
        })
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.log('📡 Response body:', responseText);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      const { user } = await response.json();
      console.log('✅ User fetched via Edge Function:', user ? 'Found' : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      // Check if it's a network error (Edge Function not available)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('🚨 Edge Function not available, falling back to mock mode');
        this.isMockMode = true;
        return this.mockGetUserByTelegramId(telegramId);
      }
      
      throw new Error(`Failed to load user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createUser(telegramUser: any, referralCode?: string): Promise<User> {
    console.log('👤 Creating user:', telegramUser.first_name, 'ID:', telegramUser.id);
    console.log('📊 Service mode:', this.isMockMode ? '🧪 Mock' : '🌐 Database');
    console.log('🎫 Referral code provided:', referralCode || 'None');
    console.log('🔗 Edge Function URL:', EDGE_FUNCTION_URL);
    
    if (this.isMockMode) {
      console.log('🧪 Creating mock user...');
      return this.mockCreateUser(telegramUser, referralCode);
    }

    try {
      console.log('🔒 Creating user via secure Edge Function...');
      console.log('📡 Request payload:', {
        action: 'create_user',
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        has_auth: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          referral_code: referralCode
        })
      });

      console.log('📡 Create user response:', response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('📡 Error response body:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { user } = await response.json();
      console.log('✅ User created via Edge Function');
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // Check if it's a network error (Edge Function not available)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('🚨 Edge Function not available, falling back to mock mode');
        this.isMockMode = true;
        return this.mockCreateUser(telegramUser, referralCode);
      }
      
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async startFreeTrial(telegramId: number): Promise<User> {
    if (this.isMockMode) {
      return this.mockStartFreeTrial(telegramId);
    }

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'start_trial',
          telegram_id: telegramId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start trial');
      }

      const { user } = await response.json();
      return user;
    } catch (error) {
      console.error('Error starting free trial:', error);
      throw error;
    }
  }

  async getFreeTrialStatus(telegramId: number): Promise<FreeTrialStatus> {
    if (this.isMockMode) {
      return this.mockGetFreeTrialStatus(telegramId);
    }

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'get_trial_status',
          telegram_id: telegramId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get trial status');
      }

      const { status } = await response.json();
      return status;
    } catch (error) {
      console.error('Error fetching trial status:', error);
      return {
        available: true,
        used: false,
        active: false,
      };
    }
  }

  // Marketing Features
  async validatePromoCode(code: string): Promise<{ valid: boolean; campaign?: any; error?: string }> {
    if (this.isMockMode) {
      // Mock validation for development
      if (code.toUpperCase() === 'NEWYEAR30') {
        return { 
          valid: true, 
          campaign: { id: 1, type: 'discount', value: 30, name: 'New Year Sale' }
        };
      }
      return { valid: false, error: 'Промокод не найден (режим разработки)' };
    }

    try {
      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single();

      if (error || !campaign) {
        return { valid: false, error: 'Промокод не найден или неактивен' };
      }

      // Check if campaign is within date range
      const now = new Date();
      if (campaign.starts_at && new Date(campaign.starts_at) > now) {
        return { valid: false, error: 'Промокод еще не активен' };
      }
      if (campaign.expires_at && new Date(campaign.expires_at) < now) {
        return { valid: false, error: 'Промокод истек' };
      }

      // Check usage limits
      if (campaign.max_uses && campaign.current_uses >= campaign.max_uses) {
        return { valid: false, error: 'Промокод исчерпан' };
      }

      return { valid: true, campaign };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, error: 'Ошибка проверки промокода' };
    }
  }

  async applyPromoCode(userId: number, campaignId: number, code: string): Promise<void> {
    if (this.isMockMode) {
      console.log('Mock: Applied promo code', { userId, campaignId, code });
      return;
    }

    try {
      // Record promo code usage
      const { error: usageError } = await supabase
        .from('promo_code_usage')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          code_used: code,
          used_at: new Date().toISOString(),
        });

      if (usageError) throw usageError;

      // Update campaign usage count
      const { error: campaignError } = await supabase
        .from('marketing_campaigns')
        .update({
          current_uses: supabase.sql`current_uses + 1`
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;
    } catch (error) {
      console.error('Error applying promo code:', error);
      throw error;
    }
  }

  async processReferral(referralCode: string, newUserId: number): Promise<void> {
    // This is now handled server-side in the Edge Function
    console.log('Referral processing handled server-side');
  }

  async getReferralStats(telegramId: number): Promise<{ invited: number; daysEarned: number }> {
    if (this.isMockMode) {
      return { invited: 2, daysEarned: 14 };
    }

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'get_referral_stats',
          telegram_id: telegramId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get referral stats');
      }

      const { stats } = await response.json();
      return stats;
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      return { invited: 0, daysEarned: 0 };
    }
  }

  // Marketing Analytics
  async getMarketingStats(): Promise<any> {
    if (this.isMockMode) {
      return [];
    }

    try {
      const { data: campaigns, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          promo_code_usage(count)
        `);

      if (error) throw error;
      return campaigns;
    } catch (error) {
      console.error('Error fetching marketing stats:', error);
      return [];
    }
  }

  // Mock methods for development
  private async mockGetUserByTelegramId(telegramId: number): Promise<User | null> {
    return this.mockUsers.get(telegramId) || null;
  }

  private async mockCreateUser(telegramUser: any, referralCode?: string): Promise<User> {
    const user: User = {
      id: Date.now(),
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      referral_code: this.generateReferralCode(telegramUser.id),
      referred_by: referralCode || null,
      total_referrals: 0,
      bonus_days_earned: 0,
      free_trial_used: false,
      subscription_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockUsers.set(telegramUser.id, user);
    return user;
  }

  private async mockStartFreeTrial(telegramId: number): Promise<User> {
    const user = this.mockUsers.get(telegramId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const updatedUser = {
      ...user,
      free_trial_used: true,
      free_trial_started_at: now.toISOString(),
      free_trial_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    };

    this.mockUsers.set(telegramId, updatedUser);
    return updatedUser;
  }

  private async mockGetFreeTrialStatus(telegramId: number): Promise<FreeTrialStatus> {
    const user = this.mockUsers.get(telegramId);
    
    if (!user) {
      return {
        available: true,
        used: false,
        active: false,
      };
    }

    if (!user.free_trial_used) {
      return {
        available: true,
        used: false,
        active: false,
      };
    }

    if (user.free_trial_expires_at) {
      const now = new Date();
      const expiresAt = new Date(user.free_trial_expires_at);
      const isActive = now < expiresAt;
      const daysRemaining = isActive 
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      return {
        available: false,
        used: true,
        active: isActive,
        expires_at: user.free_trial_expires_at,
        days_remaining: daysRemaining,
      };
    }

    return {
      available: false,
      used: true,
      active: false,
    };
  }
}

export const userService = new SupabaseUserService();