import { supabase } from '../lib/supabase';
import { xuiService } from './xuiService';
import { User, Subscription } from '../types/vpn';

interface CreateSubscriptionParams {
  telegramId: number;
  subscriptionType: 'trial' | '30days' | '90days' | '365days';
  promoCode?: string;
  paymentAmount?: number;
  isFreeTrial?: boolean;
  isFreePromoCode?: boolean;
}

interface SubscriptionResult {
  success: boolean;
  user: User;
  subscription: Subscription;
  subscriptionUrls: {
    direct: string;
    v2raytun: string;
    qr: string;
  } | null;
  subscriptionContent: string;
  serversUsed: number;
  message: string;
  error?: string;
}

class SubscriptionService {
  private isMockMode: boolean;

  constructor() {
    // Check for environment variables
    const hasSupabaseUrl = typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL;
    const hasSupabaseKey = typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY;
    this.isMockMode = !hasSupabaseUrl || !hasSupabaseKey;
    console.log('🔧 SubscriptionService initialized:', {
      mockMode: this.isMockMode,
      mode: this.isMockMode ? '🧪 Mock Mode' : '🌐 Real Service'
    });
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    console.log('💳 Creating subscription:', params);

    if (this.isMockMode) {
      return this.mockCreateSubscription(params);
    }

    try {
      // 1. Get user from database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', params.telegramId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // 2. Validate trial restrictions (only one trial per user)
      if (params.subscriptionType === 'trial' && params.isFreeTrial) {
        const { data: existingTrial } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('subscription_type', 'trial')
          .single();

        if (existingTrial) {
          throw new Error('User has already used their free trial');
        }
      }

      // 3. Validate and process promo code if provided
      let discountPercent = 0;
      let finalAmount = params.paymentAmount || 0;
      
      if (params.promoCode) {
        const { data: promoCode, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', params.promoCode.toUpperCase())
          .eq('is_active', true)
          .single();

        if (promoError || !promoCode) {
          throw new Error('Invalid or inactive promo code');
        }

        // Check expiration
        if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
          throw new Error('Promo code has expired');
        }

        // Check usage limit
        if (promoCode.max_usage && promoCode.usage_count >= promoCode.max_usage) {
          throw new Error('Promo code has reached its usage limit');
        }

        discountPercent = promoCode.discount_percent;
        finalAmount = finalAmount * (1 - discountPercent / 100);
        
        // Mark as free if 100% discount
        if (discountPercent >= 100) {
          params.isFreePromoCode = true;
          finalAmount = 0;
        }
      }

      // 4. Calculate subscription duration
      const durationMap = {
        'trial': 3,
        '30days': 30,
        '90days': 90,
        '365days': 365
      };

      const days = durationMap[params.subscriptionType];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // 5. Get all active servers and test connectivity
      const { data: allServers, error: serversError } = await supabase
        .from('servers')
        .select(`
          id, server_name, server_ip, country, status,
          vless_type, vless_security, vless_fp, vless_sni, 
          vless_sid, vless_spx, vless_flow, server_port,
          xui_api_url, xui_username, xui_password,
          vless_domain, vless_port, vless_path, inbound_id,
          vless_public_key, active_subscribers, server_role
        `)
        .eq('status', true)
        .order('active_subscribers', { ascending: true });

      if (serversError || !allServers || allServers.length === 0) {
        throw new Error('No available servers found');
      }

      // 6. Test server connectivity and get accessible servers
      console.log('🔍 Testing server connectivity...');
      const accessibleServers = await xuiService.testMultipleServers(allServers);
      
      if (accessibleServers.length === 0) {
        throw new Error('No accessible servers available at the moment');
      }

      console.log(`🌍 Using ${accessibleServers.length} accessible servers`);

      // 7. Create clients on all accessible servers
      const subscriptionResult = await xuiService.createMultiServerSubscription({
        telegramId: params.telegramId,
        subscriptionType: params.subscriptionType,
        expiryDays: days
      }, accessibleServers);

      if (!subscriptionResult || subscriptionResult.clients.length === 0) {
        throw new Error('Failed to create subscription on any server');
      }

      // 8. Create subscription record in database
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          subscription_type: params.subscriptionType,
          end_date: expiryDate.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (subError) {
        throw new Error(`Failed to create subscription record: ${subError.message}`);
      }

      // 9. Update user with subscription link and status
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: true,
          subscription_link: subscriptionResult.subscriptionUrls.direct
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('⚠️ Failed to update user:', updateError);
      }

      // 10. Create payment record if there's a payment amount
      if (finalAmount > 0 || params.promoCode) {
        await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            amount: finalAmount,
            payment_method: params.isFreePromoCode ? 'promo_code_100' : (params.isFreeTrial ? 'free_trial' : 'paid'),
            subscription_id: subscription.id,
            promo_code_used: params.promoCode,
            discount_applied: discountPercent
          });
      }

      // 11. Update server subscriber counts
      const serverUpdatePromises = subscriptionResult.clients.map(({ server }) =>
        supabase
          .from('servers')
          .update({
            active_subscribers: server.active_subscribers + 1
          })
          .eq('id', server.id)
      );
      
      await Promise.allSettled(serverUpdatePromises);

      // 12. Process promo code usage if applicable
      if (params.promoCode) {
        await this.processPromoCodeUsage(params.promoCode);
      }

      console.log('✅ Subscription created successfully');

      // Generate appropriate message
      let message = `Subscription "${params.subscriptionType}" successfully created for ${days} days`;
      if (params.isFreeTrial) {
        message = `🎉 Free trial activated for ${days} days! Enjoy ${subscriptionResult.clients.length} server locations.`;
      } else if (params.isFreePromoCode) {
        message = `🎉 100% promo code applied! Free ${params.subscriptionType} subscription for ${days} days with ${subscriptionResult.clients.length} servers.`;
      } else if (discountPercent > 0) {
        message = `🎉 ${discountPercent}% discount applied! Subscription created for ${days} days with ${subscriptionResult.clients.length} servers.`;
      }

      return {
        success: true,
        user: { ...user, subscription_status: true, subscription_link: subscriptionResult.subscriptionUrls.direct },
        subscription,
        subscriptionUrls: subscriptionResult.subscriptionUrls,
        subscriptionContent: subscriptionResult.subscriptionContent,
        serversUsed: subscriptionResult.clients.length,
        message
      };

    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      
      return {
        success: false,
        user: null as any,
        subscription: null as any,
        subscriptionUrls: null,
        subscriptionContent: '',
        serversUsed: 0,
        message: 'Failed to create subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async startFreeTrial(telegramId: number): Promise<SubscriptionResult> {
    console.log('🎯 Starting free trial for:', telegramId);

    return this.createSubscription({
      telegramId,
      subscriptionType: 'trial',
      paymentAmount: 0,
      isFreeTrial: true
    });
  }

  // NEW: Create subscription with 100% promo code
  async createFreeSubscriptionWithPromo(telegramId: number, subscriptionType: 'trial' | '30days' | '90days' | '365days', promoCode: string): Promise<SubscriptionResult> {
    console.log('🎟️ Creating free subscription with 100% promo code:', { telegramId, subscriptionType, promoCode });

    return this.createSubscription({
      telegramId,
      subscriptionType,
      promoCode,
      paymentAmount: 0,
      isFreePromoCode: true
    });
  }

  // NEW: Validate promo code before subscription creation
  async validatePromoCode(promoCode: string): Promise<{ valid: boolean; promoData?: any; error?: string }> {
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return { valid: false, error: 'Promo code not found or inactive' };
      }

      // Check expiration
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { valid: false, error: 'Promo code has expired' };
      }

      // Check usage limit
      if (promo.max_usage && promo.usage_count >= promo.max_usage) {
        return { valid: false, error: 'Promo code has reached its usage limit' };
      }

      return { valid: true, promoData: promo };
    } catch (error) {
      return { valid: false, error: 'Error validating promo code' };
    }
  }

  private async processPromoCodeUsage(promoCode: string): Promise<void> {
    try {
      // Update promo code usage count
      await supabase
        .from('promo_codes')
        .update({
          usage_count: supabase.sql`usage_count + 1`
        })
        .eq('code', promoCode.toUpperCase());

      console.log('✅ Promo code usage updated');
    } catch (error) {
      console.error('⚠️ Failed to update promo code usage:', error);
    }
  }

  // Mock implementation for development
  private async mockCreateSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    console.log('🧪 Mock subscription creation:', params);

    const durationMap = {
      'trial': 3,
      '30days': 30,
      '90days': 90,
      '365days': 365
    };

    const days = durationMap[params.subscriptionType];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const mockUser: User = {
      id: Date.now(),
      telegram_id: params.telegramId,
      username: `user_${params.telegramId}`,
      full_name: 'Mock User',
      referral_code: `MOCK_${params.telegramId}`,
      subscription_status: true,
      subscription_link: `https://vpntest.digital/subscription/${params.telegramId}?expire=${Math.floor(expiryDate.getTime() / 1000)}`,
      created_at: new Date().toISOString()
    };

    const mockSubscription: Subscription = {
      id: Date.now(),
      user_id: mockUser.id,
      subscription_type: params.subscriptionType,
      start_date: new Date().toISOString(),
      end_date: expiryDate.toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    const mockSubscriptionUrls = {
      direct: mockUser.subscription_link!,
      v2raytun: `v2raytun://import/${encodeURIComponent(mockUser.subscription_link!)}`,
      qr: `https://vpntest.digital/qr/${params.telegramId}`
    };

    const mockContent = btoa('# Mock Subscription Content\nvless://mock-config-1\nvless://mock-config-2');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    let message = `🧪 Mock subscription "${params.subscriptionType}" created for ${days} days`;
    if (params.isFreeTrial) {
      message = `🎉 Mock free trial activated for ${days} days!`;
    } else if (params.isFreePromoCode) {
      message = `🎉 Mock 100% promo code applied! Free ${params.subscriptionType} subscription.`;
    }

    return {
      success: true,
      user: mockUser,
      subscription: mockSubscription,
      subscriptionUrls: mockSubscriptionUrls,
      subscriptionContent: mockContent,
      serversUsed: 2, // Mock 2 servers
      message
    };
  }
}

export const subscriptionService = new SubscriptionService();