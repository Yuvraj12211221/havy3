// api/cashfree-create-order.js
// Vercel serverless function — adapted from paymenttest/route1(1).js

export default async function handler(req, res) {
  // Allow CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  console.log("arrebhai")
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { console.error('Failed to parse body', e); }
    }
    const { planId, amount, userId, userEmail, returnUrl } = body || {};

    if (!planId || !amount || !userId) {
      console.error('Missing fields. Parsed body:', body);
      return res.status(400).json({ error: 'Missing required fields: planId, amount, userId' });
    }

    const orderId = `order_${Date.now()}_${userId.slice(0, 8)}`;

    const orderPayload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: 'INR',
      order_note: `Subscription: ${planId} plan`,
      customer_details: {
        customer_id: `cust_${userId.slice(0, 16)}`,
        customer_email: userEmail || 'user@example.com',
        customer_phone: '9999999999',
      },
      order_meta: {
        return_url: returnUrl || `https://yourapp.com/payment?order_id={order_id}`,
      },
    };

    console.log('Sending to Cashfree:', JSON.stringify(orderPayload, null, 2));
    console.log('Using credentials - Client ID:', process.env.CASHFREE_CLIENT_ID ? 'SET' : 'NOT SET');

    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01',
      },
      body: JSON.stringify(orderPayload),
    });

    // Try to parse JSON, but log raw response if it fails
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      let text = '';
      try {
        text = await response.text();
      } catch (textError) {
        text = '[Could not read response body]';
      }
      console.error('Failed to parse JSON. Raw response:', text);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      return res.status(502).json({ error: 'Invalid response from Cashfree', details: text.slice(0, 500) });
    }

    if (!response.ok) {
      console.error('Cashfree create-order error:', data);
      return res.status(502).json({ error: data.message || 'Failed to create order at Cashfree' });
    }

    return res.status(200).json({
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
    });
  } catch (error) {
    console.error('cashfree-create-order handler error:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message, details: String(error) });
  }
}
