// api/cashfree-verify-order.js
// Vercel serverless function — adapted from paymenttest/route(1).js

import { createClient } from '@supabase/supabase-js';

// Use the service role key so this backend function can bypass RLS and write to subscriptions
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Plan benefits configuration
const PLAN_BENEFITS = {
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

function getPlanBenefits(planId) {
  return PLAN_BENEFITS[planId?.toLowerCase()] || PLAN_BENEFITS.free;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, userId, planId } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing required query param: orderId' });
    }

    // Query Cashfree for all payments on this order
    const response = await fetch(
      `https://sandbox.cashfree.com/pg/orders/${orderId}/payments`,
      {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2022-09-01',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree verify-order error:', data);
      return res.status(502).json({ error: data.message || 'Failed to fetch payment status' });
    }

    // data is an array of payments — check the first one (most recent)
    const payment = Array.isArray(data) ? data[0] : null;
    const paymentStatus = payment?.payment_status; // "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED"

    if (paymentStatus === 'SUCCESS') {
      // Update Supabase subscriptions table with plan benefits
      if (userId && planId) {
        const benefits = getPlanBenefits(planId);
        const subscriptionData = {
          user_id: userId,
          plan_id: planId,
          cashfree_order_id: orderId,
          status: 'active',
          payment_method: 'cashfree',
          benefits: benefits, // Store plan benefits as JSONB
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: dbError } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            subscriptionData,
            { onConflict: 'user_id' } // one subscription per user — update if exists
          );

        if (dbError) {
          console.error('Supabase upsert error:', dbError);
          // Don't fail the response — payment was still successful
        } else {
          console.log(`Subscription created/updated for user ${userId} with plan ${planId}`);

          // Fetch user details and send welcome email
          try {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
            
            if (userData?.user?.email) {
              // Send welcome email via API endpoint
              await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/send-welcome-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userEmail: userData.user.email,
                  userName: userData.user.user_metadata?.name || 'User',
                  planId,
                  orderId,
                }),
              });
              console.log(`Welcome email triggered for ${userData.user.email}`);
            }
          } catch (emailError) {
            console.error('Welcome email error (non-blocking):', emailError);
            // Don't fail the payment response for email errors
          }
        }
      }

      return res.status(200).json({ status: 'SUCCESS', paymentStatus });
    }

    if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
      return res.status(200).json({ status: 'FAILED', paymentStatus });
    }

    // PENDING or unknown
    return res.status(200).json({ status: 'PENDING', paymentStatus });
  } catch (error) {
    console.error('cashfree-verify-order handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
