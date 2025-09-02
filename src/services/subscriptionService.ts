import { supabase } from '../lib/supabase';
import { xuiService } from './xuiService';
import { User, Subscription } from '../types/vpn';

interface CreateSubscriptionParams {
  telegramId: number;
  subscriptionType: 'trial' | '30days' | '90days' | '365days';
  promoCode?: string;
  paymentAmount?: number;
}

interface SubscriptionResult {
  success: boolean;
  user: User;
  subscription: Subscription;
  subscriptionUrl: string;
  message: string;
  error?: string;
}

class SubscriptionService {
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
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

      // 2. Calculate subscription duration
      const durationMap = {
        'trial': 3,
        '30days': 30,
        '90days': 90,
        '365days': 365
      };

      const days = durationMap[params.subscriptionType];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // 3. Get available servers
      const { data: servers, error: serversError } = await supabase
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

      if (serversError || !servers || servers.length === 0) {
        throw new Error('No available servers');
      }

      // 4. Select optimal server
      const optimalServer = await xuiService.getOptimalServer(servers);
      console.log('🎯 Selected server:', optimalServer.server_name);

      // 5. Create client in 3x-ui panel
      console.log('🔧 Creating client in 3x-ui panel...');
      const sessionCookie = await xuiService.loginToPanel(optimalServer);
      
      const clientData = await xuiService.addClient(optimalServer, sessionCookie, {
        telegramId: params.telegramId,
        subscriptionType: params.subscriptionType,
        expiryDays: days
      });

      // 6. Generate VLESS configuration
      const vlessConfig = xuiService.generateVLESSConfig(optimalServer, clientData);
      const vlessUrl = xuiService.generateVLESSUrl(vlessConfig, optimalServer.server_name);

      // 7. Generate subscription URL
      const subscriptionUrl = xuiService.generateSubscriptionUrl(
        params.telegramId,
        Math.floor(expiryDate.getTime() / 1000)
      );

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
        throw new Error(`Failed to create subscription: ${subError.message}`);
      }

      // 9. Update user with subscription link and status
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: true,
          subscription_link: subscriptionUrl
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('⚠️ Failed to update user:', updateError);
      }

      // 10. Create payment record if applicable
      if (params.paymentAmount && params.paymentAmount > 0) {
        await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            amount: params.paymentAmount,
            payment_method: 'promo_code',
            subscription_id: subscription.id,
            promo_code_used: params.promoCode
          });
      }

      // 11. Update server subscriber count
      await supabase
        .from('servers')
        .update({
          active_subscribers: optimalServer.active_subscribers + 1
        })
        .eq('id', optimalServer.id);

      // 12. Process promo code usage if applicable
      if (params.promoCode) {
        await this.processPromoCodeUsage(params.promoCode);
      }

      console.log('✅ Subscription created successfully');

      return {
        success: true,
        user: { ...user, subscription_status: true, subscription_link: subscriptionUrl },
        subscription,
        subscriptionUrl,
        message: `Подписка "${params.subscriptionType}" успешно создана на ${days} дней`
      };

    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      
      return {
        success: false,
        user: null as any,
        subscription: null as any,
        subscriptionUrl: '',
        message: 'Ошибка создания подписки',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async startFreeTrial(telegramId: number): Promise<SubscriptionResult> {
    console.log('🎯 Starting free trial for:', telegramId);

    return this.createSubscription({
      telegramId,
      subscriptionType: 'trial',
      paymentAmount: 0
    });
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
      subscription_link: xuiService.generateSubscriptionUrl(
        params.telegramId,
        Math.floor(expiryDate.getTime() / 1000)
      ),
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

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      user: mockUser,
      subscription: mockSubscription,
      subscriptionUrl: mockUser.subscription_link!,
      message: `🧪 Mock подписка "${params.subscriptionType}" создана на ${days} дней`
    };
  }
}

export const subscriptionService = new SubscriptionService();