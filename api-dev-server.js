#!/usr/bin/env node
// api-dev-server.js - Local development server for API endpoints
import http from 'http';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

Object.assign(process.env, env);

// Helper functions
function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, details = {}) {
  sendJSON(res, statusCode, { error: message, ...details });
}

// Cashfree Create Order Handler
async function handleCashfreeCreateOrder(req, res, body) {
  try {
    const data = JSON.parse(body);
    const { planId, amount, userId, userEmail, returnUrl } = data;

    if (!planId || !amount || !userId) {
      return sendError(res, 400, 'Missing required fields: planId, amount, userId');
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

    console.log('📦 Creating Cashfree order:', orderId);
    console.log('   Client ID:', process.env.CASHFREE_CLIENT_ID ? '✓ SET' : '✗ NOT SET');

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

    const responseText = await response.text();
    console.log('   Status:', response.status);
    console.log('   Response:', responseText.slice(0, 300));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Cashfree returned invalid JSON');
      console.error('Status:', response.status);
      console.error('Body:', responseText.slice(0, 500));
      return sendError(res, 502, 'Invalid response from Cashfree', { 
        details: responseText.slice(0, 200) 
      });
    }

    if (!response.ok) {
      console.error('❌ Cashfree error:', responseData);
      return sendError(res, 502, responseData.message || 'Failed to create order at Cashfree');
    }

    console.log('✅ Order created:', responseData.order_id);
    console.log('   Session ID:', responseData.payment_session_id ? '✓ SET' : '✗ MISSING');
    sendJSON(res, 200, {
      orderId: responseData.order_id,
      paymentSessionId: responseData.payment_session_id,
    });

  } catch (error) {
    console.error('❌ Handler error:', error.message);
    sendError(res, 500, error.message);
  }
}

// Cashfree Verify Order Handler
async function handleCashfreeVerifyOrder(req, res, body, query) {
  try {
    const { orderId, userId, planId } = query;

    if (!orderId) {
      return sendError(res, 400, 'Missing orderId parameter');
    }

    console.log('🔍 Verifying order:', orderId);

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

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Cashfree returned invalid JSON');
      return sendError(res, 502, 'Invalid response from Cashfree');
    }

    if (!response.ok) {
      console.error('❌ Verification failed:', responseData);
      return sendError(res, 502, responseData.message || 'Verification failed');
    }

    const payments = Array.isArray(responseData) ? responseData : responseData.payments || [];
    const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

    if (successPayment) {
      console.log('✅ Payment verified successfully');
      sendJSON(res, 200, { status: 'SUCCESS', payment: successPayment });
    } else {
      console.log('⚠️ No successful payment found');
      sendJSON(res, 200, { status: 'FAILED', message: 'No successful payment found' });
    }

  } catch (error) {
    console.error('❌ Handler error:', error.message);
    sendError(res, 500, error.message);
  }
}

// Main server
const PORT = 3000;
const server = http.createServer(async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);

  // Collect body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      // Routes
      if (pathname === '/api/cashfree-create-order' && req.method === 'POST') {
        await handleCashfreeCreateOrder(req, res, body);
      } else if (pathname === '/api/cashfree-verify-order' && req.method === 'GET') {
        await handleCashfreeVerifyOrder(req, res, body, query);
      } else if (pathname === '/api/send-welcome-email' && req.method === 'POST') {
        // Mock email endpoint
        sendJSON(res, 200, { success: true, message: 'Email sent' });
      } else {
        sendError(res, 404, 'Endpoint not found');
      }
    } catch (error) {
      console.error('Server error:', error);
      sendError(res, 500, 'Internal server error');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 API Development Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Cashfree Client ID: ${process.env.CASHFREE_CLIENT_ID ? '✓ SET' : '✗ NOT SET'}`);
  console.log(`✓ Environment loaded from .env.local`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
