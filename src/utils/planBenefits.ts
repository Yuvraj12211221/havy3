// Plan benefits and features configuration
export interface PlanBenefits {
  maxChatbots: number;
  maxFaqDocuments: number;
  maxApiCalls: number;
  maxTtsCharacters: number;
  maxSttUses: number;
  maxEmailResponses: number;
}

export const PLAN_BENEFITS: Record<string, PlanBenefits> = {
  free: {
    maxChatbots: 1,
    maxFaqDocuments: 50,
    maxApiCalls: 1000,
    maxTtsCharacters: 1000,
    maxSttUses: 500,
    maxEmailResponses: 500,
  },
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

export const getPlanBenefits = (planId: string): PlanBenefits => {
  return PLAN_BENEFITS[planId.toLowerCase()] || PLAN_BENEFITS.free;
};

export const getPlanFeaturesList = (planId: string): string[] => {
  const benefits = getPlanBenefits(planId);
  const features = [];

  if (benefits.maxChatbots > 1) {
    features.push(`Up to ${benefits.maxChatbots} chatbots`);
  } else {
    features.push('1 chatbot');
  }

  if (benefits.maxFaqDocuments > 1) {
    features.push(`Up to ${benefits.maxFaqDocuments} FAQ documents`);
  }

  features.push(`${benefits.maxApiCalls.toLocaleString()} API calls/month`);
  features.push(`${benefits.maxTtsCharacters.toLocaleString()} TTS characters/month`);

  const isPaidPlan = planId.toLowerCase() !== 'free';
  const isProOrHigher = planId === 'professional' || planId === 'enterprise';
  const isEnterprise = planId === 'enterprise';

  if (isPaidPlan) features.push('Advanced analytics');
  if (isProOrHigher) features.push('Priority support');
  if (isProOrHigher) features.push('Custom branding');
  if (isEnterprise) features.push('Custom domain');

  return features;
};
