// api/razorpay-verify-order.js
// Verify Razorpay payment signature and update subscription

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, paymentId, signature, userId, planId } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'Missing required fields: orderId, paymentId, signature'
      });
    }

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const computed_signature = hmac.digest('hex');

    if (computed_signature !== signature) {
      console.error('Signature mismatch - Possible security breach');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Signature is valid - update subscription in Supabase
    if (userId && planId) {
      const { error: dbError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            plan_id: planId,
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (dbError) {
        console.error('Supabase upsert error:', dbError);
      }
    }

    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Payment verified and subscription activated',
      orderId,
      paymentId,
    });
  } catch (error) {
    console.error('razorpay-verify-order handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
