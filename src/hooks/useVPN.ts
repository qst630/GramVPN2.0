import { useState, useEffect } from 'react';
import { User, UserStats, SubscriptionPlan } from '../types/vpn';
import { directSupabaseService } from '../services/directSupabaseService';
import { subscriptionService } from '../services/subscriptionService';

interface UseVPNReturn {
  user: User | null;
  subscriptionType: string | null;
  daysRemaining: number;
  hasActiveSubscription: boolean;
  referralStats: { referrals_count: number; bonus_days_earned: number };
  subscriptionPlans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  
  // Actions
  startTrial: () => Promise<void>;
  createSubscription: (planType: string, promoCode?: string) => Promise<void>;
  validatePromoCode: (code: string) => Promise<{ valid: boolean; promo_code?: any; error?: string }>;
  refreshUser: () => Promise<void>;
  isCreatingSubscription: boolean;
}

export const useVPN = (telegramUser: any, referralCode?: string): UseVPNReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [referralStats, setReferralStats] = useState({ referrals_count: 0, bonus_days_earned: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);

  const subscriptionPlans = directSupabaseService.getSubscriptionPlans();

  const loadUser = async () => {
    if (!telegramUser) {
      console.log('⏭️ No Telegram user, skipping load');
      setLoading(false);
      return;
    }

    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('⚠️ Supabase not configured, using demo mode');
      console.log('📊 Environment check:', {
        hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      setUser({
        id: Date.now(),
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        referral_code: `DEMO_${telegramUser.id}`,
        subscription_status: false,
        created_at: new Date().toISOString()
      });
      setSubscriptionType(null);
      setDaysRemaining(0);
      setHasActiveSubscription(false);
      setReferralStats({ referrals_count: 0, bonus_days_earned: 0 });
      setLoading(false);
      return;
    }
    
    console.log('🚀 STARTING USER LOAD PROCESS');
    console.log('📊 Telegram user data:', {
      id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username
    });
    console.log('🎫 Referral code from URL:', referralCode || 'None');
    
    setLoading(true);

    try {
      setError(null);
      
      // Get or create user
      console.log('🔍 STEP 1: Getting or creating user...');
      const userData = await directSupabaseService.getOrCreateUser(telegramUser, referralCode);
      console.log('✅ STEP 1 COMPLETE: User data received:', {
        id: userData.id,
        telegram_id: userData.telegram_id,
        referral_code: userData.referral_code,
        subscription_status: userData.subscription_status
      });
      setUser(userData);

      // Get user status (subscription info)
      console.log('🔍 STEP 2: Getting user status...');
      const status = await directSupabaseService.getUserStatus(telegramUser.id);
      console.log('✅ STEP 2 COMPLETE: User status:', status);
      
      setSubscriptionType(status.subscription_type);
      setDaysRemaining(status.days_remaining);
      setHasActiveSubscription(status.has_active_subscription);

      // Get referral stats
      console.log('🔍 STEP 3: Getting referral stats...');
      const stats = await directSupabaseService.getReferralStats(telegramUser.id);
      console.log('✅ STEP 3 COMPLETE: Referral stats:', stats);
      setReferralStats(stats);

      console.log('🎉 USER LOAD PROCESS COMPLETED SUCCESSFULLY');

    } catch (err) {
      console.error('❌ FATAL ERROR in user load process:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      console.error('🚨 Error details:', {
        message: errorMessage,
        type: typeof err,
        stack: err instanceof Error ? err.stack : 'No stack'
      });
      
      // Only show error if no Supabase connection configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('🔧 Environment not configured, showing setup error');
        setError('База данных не настроена. Нажмите "Connect to Supabase" для настройки.');
      } else {
        // For configured Supabase but connection issues, use fallback mode
        console.log('🔄 FALLBACK MODE: Using demo data due to connection issues');
        console.log('💡 This means Supabase is configured but not accessible');
        setUser({
          id: Date.now(),
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
          referral_code: `DEMO_${telegramUser.id}`,
          subscription_status: false,
          created_at: new Date().toISOString()
        });
        setSubscriptionType(null);
        setDaysRemaining(0);
        setHasActiveSubscription(false);
        setReferralStats({ referrals_count: 0, bonus_days_earned: 0 });
      }
    } finally {
      console.log('🏁 USER LOAD PROCESS FINISHED');
      setLoading(false);
    }
  };

  const startTrial = async () => {
    if (!telegramUser) {
      throw new Error('No telegram user');
    }

    setIsCreatingSubscription(true);
    try {
      setError(null);
      console.log('🎯 Starting trial...');
      
      const result = await subscriptionService.startFreeTrial(telegramUser.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start trial');
      }
      
      console.log('✅ Trial started successfully:', result.message);
      
      // Refresh user data
      await loadUser();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start trial';
      setError(errorMessage);
      console.error('Error starting trial:', err);
      throw new Error(errorMessage);
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const createSubscription = async (planType: string, promoCode?: string) => {
    if (!telegramUser || !user) {
      throw new Error('No user data');
    }

    setIsCreatingSubscription(true);
    try {
      setError(null);
      console.log('💳 Creating subscription:', { planType, promoCode });
      
      const result = await subscriptionService.createSubscription({
        telegramId: telegramUser.id,
        subscriptionType: planType as any,
        promoCode,
        paymentAmount: 0 // Will be calculated based on promo code
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create subscription');
      }
      
      console.log('✅ Subscription created successfully:', result.message);
      
      // Refresh user data
      await loadUser();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      console.error('Error creating subscription:', err);
      throw new Error(errorMessage);
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const validatePromoCode = async (code: string) => {
    try {
      return await directSupabaseService.validatePromoCode(code);
    } catch (err) {
      console.error('Error validating promo code:', err);
      return { valid: false, error: 'Ошибка проверки промокода' };
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  useEffect(() => {
    loadUser();
  }, [telegramUser]);

  return {
    user,
    subscriptionType,
    daysRemaining,
    hasActiveSubscription,
    referralStats,
    subscriptionPlans,
    loading,
    error,
    isCreatingSubscription,
    startTrial,
    createSubscription,
    validatePromoCode,
    refreshUser,
  };
};