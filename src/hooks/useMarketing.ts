import { useState } from 'react';
import { directSupabaseService } from '../services/directSupabaseService';
import { PromoCodeValidation } from '../types/user';

interface UseMarketingReturn {
  validatePromoCode: (code: string) => Promise<PromoCodeValidation>;
  applyPromoCode: (userId: number, campaignId: number, code: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useMarketing = (): UseMarketingReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePromoCode = async (code: string): Promise<PromoCodeValidation> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎫 useMarketing: Validating promo code:', code);
      const result = await directSupabaseService.validatePromoCode(code);
      console.log('📊 useMarketing: Validation result:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка проверки промокода';
      console.error('❌ useMarketing: Validation error:', errorMessage);
      setError(errorMessage);
      return { valid: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = async (userId: number, campaignId: number, code: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await directSupabaseService.applyPromoCode(userId, campaignId, code);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка применения промокода';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    validatePromoCode,
    applyPromoCode,
    loading,
    error,
  };
};