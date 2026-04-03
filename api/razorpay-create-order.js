// api/razorpay-create-order.js
// Create Razorpay order for payment

const Razorpay = require('razorpay');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse body', e);
      }
    }

    const { planId, amount, userId, userEmail } = body || {};

    if (!planId || !amount || !userId || !userEmail) {
      console.error('Missing fields. Parsed body:', body);
      return res.status(400).json({
        error: 'Missing required fields: planId, amount, userId, userEmail'
      });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create order
    const options = {
      amount: Math.round(Number(amount) * 100), // Convert to paise (smallest unit)
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.slice(0, 8)}`,
      payment_capture: 1, // Auto-capture payment
      notes: {
        plan_id: planId,
        user_id: userId,
        user_email: userEmail,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('razorpay-create-order handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
