// src/hooks/useUsageTracking.ts
// React hook for usage tracking

import { useAuth } from '../contexts/AuthContext';
import * as usageTracking from '../utils/usageTracking';

export const useUsageTracking = () => {
  const { user } = useAuth();

  if (!user) {
    return {
      trackApiCall: async () => null,
      trackTtsUsage: async () => null,
      trackSttUsage: async () => null,
      trackChatbotCreated: async () => null,
      trackFaqCreated: async () => null,
      trackEmailResponseSent: async () => null,
    };
  }

  return {
    trackApiCall: (metadata?: Record<string, any>) =>
      usageTracking.trackApiCall(user.id, metadata),
    
    trackTtsUsage: (characters: number, metadata?: Record<string, any>) =>
      usageTracking.trackTtsUsage(user.id, characters, metadata),
    
    trackSttUsage: (count: number = 1, metadata?: Record<string, any>) =>
      usageTracking.trackSttUsage(user.id, count, metadata),
    
    trackChatbotCreated: (chatbotId: string) =>
      usageTracking.trackChatbotCreated(user.id, chatbotId),
    
    trackFaqCreated: (faqId: string) =>
      usageTracking.trackFaqCreated(user.id, faqId),
    
    trackEmailResponseSent: (count: number = 1, metadata?: Record<string, any>) =>
      usageTracking.trackEmailResponseSent(user.id, count, metadata),
  };
};
