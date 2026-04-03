import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PlanBenefits {
  maxChatbots: number;
  maxFaqDocuments: number;
  maxApiCalls: number;
  maxTtsCharacters: number;
  maxSttUses: number;
  maxEmailResponses: number;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled';
  benefits: PlanBenefits;
  cashfree_order_id?: string;
  payment_method?: string;
  activated_at?: string;
  updated_at: string;
}

type SubscriptionContextType = {
  subscription: Subscription | null;
  planId: string;
  benefits: PlanBenefits | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  setSubscription: (sub: Subscription | null) => void;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  planId: 'free',
  benefits: null,
  loading: true,
  refreshSubscription: async () => {},
  setSubscription: () => {},
});

// Default benefits for free plan
const DEFAULT_FREE_BENEFITS: PlanBenefits = {
  maxChatbots: 1,
  maxFaqDocuments: 50,
  maxApiCalls: 1000,
  maxTtsCharacters: 1000,
  maxSttUses: 500,
  maxEmailResponses: 500,
};

// Plan benefits for all tiers
const PLAN_BENEFITS_MAP: Record<string, PlanBenefits> = {
  free: DEFAULT_FREE_BENEFITS,
  starter: {
    maxChatbots: 3,
    maxFaqDocuments: 200,
    maxApiCalls: 5000,
    maxTtsCharacters: 5000,
    maxSttUses: 2000,
    maxEmailResponses: 2000,
  },
  professional: {
    maxChatbots: 10,
    maxFaqDocuments: 500,
    maxApiCalls: 50000,
    maxTtsCharacters: 50000,
    maxSttUses: 5000,
    maxEmailResponses: 5000,
  },
  enterprise: {
    maxChatbots: 999,
    maxFaqDocuments: 9999,
    maxApiCalls: 999999,
    maxTtsCharacters: 999999,
    maxSttUses: 999999,
    maxEmailResponses: 999999,
  },
};

const STORAGE_KEY = 'fiesta_subscription';

export function SubscriptionProvider({ children, userId }: { children: React.ReactNode; userId: string | undefined }) {
  const [subscription, setSubscriptionState] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    if (!userId) {
      setSubscriptionState(null);
      setLoading(false);
      return;
    }

    try {
      // First, try to load from localStorage
      const storedSub = localStorage.getItem(STORAGE_KEY);
      if (storedSub) {
        const parsed = JSON.parse(storedSub);
        if (parsed.user_id === userId) {
          setSubscriptionState(parsed);
          setLoading(false);
          return;
        }
      }

      // Try to load from Supabase (optional - won't fail if table doesn't exist)
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data) {
          const sub = data as Subscription;
          // Save to localStorage for faster access
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
          setSubscriptionState(sub);
          setLoading(false);
          return;
        }
      } catch (supabaseErr) {
        // Supabase table doesn't exist or network error - use localStorage fallback
        console.log('Supabase not available, using localStorage');
      }

      // No subscription found - user is on free plan
      const freeSubscription: Subscription = {
        id: `free_${userId}`,
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        benefits: DEFAULT_FREE_BENEFITS,
        updated_at: new Date().toISOString(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freeSubscription));
      setSubscriptionState(freeSubscription);
    } catch (err) {
      console.error('Subscription load error:', err);
      setSubscriptionState(null);
    } finally {
      setLoading(false);
    }
  };

  const setSubscription = (sub: Subscription | null) => {
    if (sub) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSubscriptionState(sub);
  };

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const planId = subscription?.plan_id || 'free';
  const benefits = subscription?.benefits || PLAN_BENEFITS_MAP[planId] || DEFAULT_FREE_BENEFITS;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        planId,
        benefits,
        loading,
        refreshSubscription: loadSubscription,
        setSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export { PLAN_BENEFITS_MAP, DEFAULT_FREE_BENEFITS };
