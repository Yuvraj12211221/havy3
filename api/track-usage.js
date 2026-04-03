// api/track-usage.js
// Track user API calls, TTS usage, STT usage, etc. with concurrent safety

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, usageType, amount, metadata } = req.body;

    if (!userId || !usageType || !amount) {
      return res.status(400).json({ error: 'Missing required fields: userId, usageType, amount' });
    }

    // Validate usage type
    const validTypes = ['api_call', 'tts_character', 'stt_use', 'chatbot_created', 'faq_document_created', 'email_response_sent', 'storage_used'];
    if (!validTypes.includes(usageType)) {
      return res.status(400).json({ error: `Invalid usageType. Must be one of: ${validTypes.join(', ')}` });
    }

    // Get current billing month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingMonth = firstDay.toISOString().split('T')[0];

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan_id, benefits')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Subscription fetch error:', subError);
    }

    const subscriptionId = subscription?.id || null;

    // 1. INSERT usage tracking record (concurrent-safe)
    const { data: usageRecord, error: insertError } = await supabaseAdmin
      .from('usage_tracking')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        usage_type: usageType,
        amount: parseFloat(amount),
        metadata: metadata || {},
        tracked_date: new Date().toISOString().split('T')[0],
        billing_month: billingMonth,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Usage tracking insert error:', insertError);
      return res.status(500).json({ error: 'Failed to record usage', details: insertError.message });
    }

    // 2. Aggregate usage for this month (concurrent-safe atomic operation)
    const currentMonth = billingMonth;
    
    // Map usage type to column name
    const typeColumnMap = {
      'api_call': 'api_calls_used',
      'tts_character': 'tts_characters_used',
      'stt_use': 'stt_uses_used',
      'chatbot_created': 'chatbots_created',
      'faq_document_created': 'faq_created',
      'email_response_sent': 'email_responses_sent',
      'storage_used': 'storage_used_gb'
    };

    const columnName = typeColumnMap[usageType];
    if (!columnName) {
      return res.status(400).json({ error: 'Invalid usage type mapping' });
    }

    // 3. Update or create monthly summary (UPSERT with atomic increment)
    const { data: benefits } = await supabaseAdmin
      .from('subscriptions')
      .select('benefits')
      .eq('id', subscriptionId)
      .single();

    const benefitsObj = benefits?.benefits || {
      maxApiCalls: 1000,
      maxTtsCharacters: 1000,
      maxSttUses: 500,
      maxEmailResponses: 500,
      maxChatbots: 1,
      maxFaqDocuments: 50
    };

    // Upsert monthly summary with increment
    const { error: summaryError } = await supabaseAdmin
      .from('usage_monthly_summary')
      .upsert({
        user_id: userId,
        subscription_id: subscriptionId,
        billing_month: currentMonth,
        plan_id: subscription?.plan_id || 'free',
        
        // Set limits from plan benefits
        api_calls_limit: benefitsObj.maxApiCalls || 1000,
        tts_characters_limit: benefitsObj.maxTtsCharacters || 1000,
        stt_uses_limit: benefitsObj.maxSttUses || 500,
        email_responses_limit: benefitsObj.maxEmailResponses || 500,
        chatbots_limit: benefitsObj.maxChatbots || 1,
        faq_limit: benefitsObj.maxFaqDocuments || 50,
        
        // Will be incremented by trigger
        [columnName]: usageType === 'tts_character' || usageType === 'stt_use' || usageType === 'storage_used' 
          ? parseFloat(amount)  // Numeric types
          : 1,  // Count-based types
        
        updated_at: new Date().toISOString()
      });

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Summary update error:', summaryError);
    }

    // 4. Fetch updated usage stats for this month
    const { data: monthlyUsage, error: fetchError } = await supabaseAdmin
      .from('usage_tracking')
      .select('usage_type, amount')
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .gte('tracked_date', firstDay.toISOString().split('T')[0]);

    const totalUsed = monthlyUsage?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;

    // Get limits from plan
    const limitKey = {
      'api_call': 'maxApiCalls',
      'tts_character': 'maxTtsCharacters',
      'stt_use': 'maxSttUses',
      'chatbot_created': 'maxChatbots',
      'faq_document_created': 'maxFaqDocuments',
      'email_response_sent': 'maxEmailResponses',
      'storage_used': 'storageGB'
    }[usageType];

    const limit = benefitsObj[limitKey] || Infinity;
    const percentageUsed = limit === Infinity ? 0 : Math.round((totalUsed / limit) * 100);

    return res.status(200).json({
      success: true,
      tracked: {
        id: usageRecord.id,
        type: usageType,
        amount: parseFloat(amount)
      },
      usage: {
        type: usageType,
        totalUsed: totalUsed.toFixed(2),
        limit: limit === Infinity ? 'Unlimited' : limit,
        percentageUsed: Math.min(percentageUsed, 100),
        remaining: Math.max(0, limit - totalUsed),
        isOverLimit: totalUsed > limit
      }
    });
  } catch (error) {
    console.error('track-usage handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
  }
}
