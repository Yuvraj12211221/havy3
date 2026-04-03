# Razorpay Integration Guide - Production Ready

## 🎯 Overview

Your application now uses **Razorpay** for real payment processing in India. This guide covers setup, testing, and deployment.

## 📋 Prerequisites

### 1. Create Razorpay Account
- Go to https://razorpay.com
- Sign up and verify your account
- KYC verification required for production mode

### 2. Get API Credentials
1. Log in to Razorpay Dashboard
2. Navigate to **Settings > API Keys**
3. You'll find:
   - **KEY_ID** (Publishable Key)
   - **KEY_SECRET** (Secret Key)

## ⚙️ Configuration

### Local Development (Test Mode)

1. **Get Test credentials from Razorpay Dashboard**
   - Use test KEY_ID and KEY_SECRET

2. **Update `.env.local`**:
   ```
   RAZORPAY_KEY_ID=rzp_test_<your_test_key_id>
   RAZORPAY_KEY_SECRET=<your_test_key_secret>
   ```

3. **Install Dependencies**:
   ```bash
   npm install razorpay
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Test Payment**:
   - Go to `/pricing` page
   - Select any paid plan
   - Use test card: **4111 1111 1111 1111**
   - Expiry: Any future date (e.g., 12/25)
   - CVV: Any 3 digits

### Test Credentials

**Successful Payment:**
- Card: 4111 1111 1111 1111
- Expiry: 12/25 (or any future date)
- CVV: 123

**Failed Payment:**
- Card: 4444 4444 4444 4444
- Expiry: 12/25
- CVV: 123

## 🚀 Production Deployment

### 1. Switch to Production Keys

Once KYC is verified by Razorpay:

1. Go to **Settings > API Keys**
2. Switch from **Test** to **Live** mode
3. Copy your **Live KEY_ID** and **KEY_SECRET**

### 2. Update Environment Variables

**In Vercel/Production:**
```
RAZORPAY_KEY_ID=rzp_live_<your_live_key_id>
RAZORPAY_KEY_SECRET=<your_live_key_secret>
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

### 3. Verify Database Schema

Ensure your Supabase `subscriptions` table has these columns:
```sql
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  plan_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Update Company Logo (Optional)

In `src/pages/Payment.tsx`, update the logo URL:
```typescript
image: 'https://your-logo-url.com/logo.png',
```

## 🔄 Payment Flow

```
User → Plan Selection → /payment → Create Order
                                  ↓
                         Load Razorpay SDK
                                  ↓
                         Open Payment Modal
                                  ↓
                    User enters card details
                                  ↓
                    Razorpay processes payment
                                  ↓
                    Server verifies signature
                                  ↓
                Update Supabase subscriptions
                                  ↓
                         Show success screen
```

## 📊 API Endpoints

### Create Order
- **File**: `api/razorpay-create-order.js`
- **Method**: POST
- **Input**: `{ planId, amount, userId, userEmail }`
- **Output**: `{ orderId, amount, currency, key }`

### Verify Payment
- **File**: `api/razorpay-verify-order.js`
- **Method**: POST
- **Input**: `{ orderId, paymentId, signature, userId, planId }`
- **Output**: `{ status, message, orderId, paymentId }`

## 🛡️ Security Features

✅ **Signature Verification**: All payments verified using HMAC-SHA256
✅ **Service Role Key**: Database updates use admin credentials
✅ **Webhook Support**: Ready for webhook verification (optional)
✅ **Error Handling**: Graceful error messages to users
✅ **Environment Variables**: Sensitive data never exposed

## 🧪 Testing Checklist

- [ ] Local setup with test credentials
- [ ] Create order endpoint working
- [ ] Payment modal opens correctly
- [ ] Test payment completes
- [ ] Signature verification passes
- [ ] Subscription created in Supabase
- [ ] Success screen displays
- [ ] Dark/light mode working

## 🐛 Troubleshooting

### "razorpay is not defined"
```bash
npm install razorpay
```

### Payment fails silently
1. Check browser console for errors
2. Verify RAZORPAY_KEY_ID is correct
3. Ensure SDK loads: check Network tab

### Signature mismatch
1. Verify RAZORPAY_KEY_SECRET is correct
2. Check orderId and paymentId being passed
3. Ensure no spaces in credentials

### Subscription not updating
1. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
2. Check subscriptions table exists
3. Verify RLS policies allow service role

## 📚 Useful Links

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Dashboard](https://dashboard.razorpay.com)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/payments-guide-payments/test-cards/)
- [Supabase Documentation](https://supabase.com/docs)

## 🎉 You're All Set!

Your Razorpay integration is ready:
- ✅ Frontend payment flow implemented
- ✅ Backend order creation configured
- ✅ Payment verification with signatures
- ✅ Supabase subscription tracking
- ✅ Error handling and user feedback

**Next Steps:**
1. Install razorpay package: `npm install razorpay`
2. Get Razorpay test credentials
3. Update `.env.local` with credentials
4. Test locally with test cards
5. Deploy to production

For questions, check the API files or Razorpay documentation.
