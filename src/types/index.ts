export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  plan: 'starter' | 'professional' | 'enterprise';
  createdAt: string;
}

export interface AnalyticsData {
  chatbotInteractions: number;
  emailResponses: number;
  textToSpeechUsage: number;
  totalApiCalls: number;
  monthlyGrowth: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
}

export interface EmbedCode {
  type: 'chatbot' | 'email' | 'tts';
  code: string;
  settings: Record<string, any>;
}