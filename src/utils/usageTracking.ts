// src/utils/usageTracking.ts
// Utilities for tracking user usage across the application

export type UsageType = 'api_call' | 'tts_character' | 'stt_use' | 'chatbot_created' | 'faq_document_created' | 'email_response_sent';

interface UsageResponse {
  success: boolean;
  tracked: {
    id: string;
    type: UsageType;
    amount: number;
  };
  usage: {
    type: UsageType;
    totalUsed: number;
    limit: number | string;
    percentageUsed: number;
    remaining: number;
    isOverLimit: boolean;
  };
}

/**
 * Track user usage for a specific resource
 * @param userId - The user's ID
 * @param usageType - Type of usage to track
 * @param amount - Amount of usage
 * @param metadata - Optional metadata about the usage
 */
export const trackUsage = async (
  userId: string,
  usageType: UsageType,
  amount: number,
  metadata?: Record<string, any>
): Promise<UsageResponse | null> => {
  try {
    const response = await fetch('/api/track-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        usageType,
        amount,
        metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Usage tracking error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to track usage:', error);
    return null;
  }
};

/**
 * Track API call usage
 */
export const trackApiCall = async (userId: string, metadata?: Record<string, any>) => {
  return trackUsage(userId, 'api_call', 1, metadata);
};

/**
 * Track TTS character usage
 */
export const trackTtsUsage = async (userId: string, characters: number, metadata?: Record<string, any>) => {
  return trackUsage(userId, 'tts_character', characters, metadata);
};

/**
 * Track STT (Speech-to-Text) usage
 */
export const trackSttUsage = async (userId: string, count: number = 1, metadata?: Record<string, any>) => {
  return trackUsage(userId, 'stt_use', count, metadata);
};

/**
 * Track chatbot creation
 */
export const trackChatbotCreated = async (userId: string, chatbotId: string) => {
  return trackUsage(userId, 'chatbot_created', 1, { chatbotId });
};

/**
 * Track FAQ document creation
 */
export const trackFaqCreated = async (userId: string, faqId: string) => {
  return trackUsage(userId, 'faq_document_created', 1, { faqId });
};

/**
 * Track email response sent
 */
export const trackEmailResponseSent = async (userId: string, count: number = 1, metadata?: Record<string, any>) => {
  return trackUsage(userId, 'email_response_sent', count, metadata);
};
