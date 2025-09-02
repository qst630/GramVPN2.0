import { useState, useEffect } from 'react';
import { User, FreeTrialStatus } from '../types/user';
import { userService } from '../services/supabaseUserService';

interface UseUserReturn {
  user: User | null;
  freeTrialStatus: FreeTrialStatus | null;
  loading: boolean;
  error: string | null;
  startFreeTrial: () => Promise<void>;
  refreshUser: () => Promise<void>;
  referralStats: { invited: number; daysEarned: number };
}

export const useUser = (telegramUser: any): UseUserReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [freeTrialStatus, setFreeTrialStatus] = useState<FreeTrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ invited: 0, daysEarned: 0 });

  const loadUser = async () => {
    if (!telegramUser) {
      console.log('⏭️ No Telegram user, skipping load');
      setLoading(false);
      return;
    }

    console.log('🚀 Loading user for Telegram ID:', telegramUser.id);
    setLoading(true);

    try {
      setError(null);
      
      // Try to get existing user
      console.log('🔍 Attempting to get user from database...');
      let userData = await userService.getUserByTelegramId(telegramUser.id);
      console.log('📊 User data result:', userData ? '✅ Found' : '❌ Not found');
      
      // Create user if doesn't exist
      if (!userData) {
        console.log('👤 User not found, creating new user...');
        try {
          userData = await userService.createUser(telegramUser);
        } catch (createError) {
          console.error('❌ User creation failed:', createError);
          // If creation fails, try to get user again (maybe it was created by another process)
          userData = await userService.getUserByTelegramId(telegramUser.id);
          if (!userData) {
            throw createError; // Re-throw the original error if user still doesn't exist
          }
          console.log('✅ User found after creation error - continuing...');
        }
        console.log('✅ Created new user with ID:', userData.id);
      }

      setUser(userData);

      // Get trial status
      console.log('🎯 Getting trial status...');
      const trialStatus = await userService.getFreeTrialStatus(telegramUser.id);
      console.log('📊 Trial status:', {
        available: trialStatus.available,
        used: trialStatus.used,
        active: trialStatus.active,
        daysRemaining: trialStatus.days_remaining
      });
      setFreeTrialStatus(trialStatus);

      // Get referral stats
      console.log('📈 Getting referral stats...');
      const stats = await userService.getReferralStats(telegramUser.id);
      console.log('📊 Referral stats:', stats);
      setReferralStats(stats);

    } catch (err) {
      console.error('❌ Error loading user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      console.error('🚨 Setting error state:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('✅ Load user process completed');
      setLoading(false);
    }
  };

  const startFreeTrial = async () => {
    if (!telegramUser || !freeTrialStatus?.available) {
      return;
    }

    try {
      setError(null);
      const updatedUser = await userService.startFreeTrial(telegramUser.id);
      setUser(updatedUser);

      // Refresh trial status
      const trialStatus = await userService.getFreeTrialStatus(telegramUser.id);
      setFreeTrialStatus(trialStatus);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start free trial');
      console.error('Error starting free trial:', err);
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
    freeTrialStatus,
    loading,
    error,
    startFreeTrial,
    refreshUser,
    referralStats,
  };
};