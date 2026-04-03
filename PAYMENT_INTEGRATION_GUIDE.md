# Payment Integration Guide - Cashfree

This guide explains how the Cashfree payment gateway is integrated and how to test it.

## ✅ Current Setup

### Files Involved
- **Frontend**: `src/pages/Payment.tsx` - Payment flow and UI
- **Frontend**: `src/pages/PricingSelect.tsx` - Plan selection
- **Backend**: `api/cashfree-create-order.js` - Create Cashfree orders
- **Backend**: `api/cashfree-verify-order.js` - Verify payment status

### Environment Variables
These are already configured in `.env.local`:
```
CASHFREE_CLIENT_ID=TEST110206647d4557d956493b73bac046602011
CASHFREE_SECRET_KEY=cfsk_ma_test_e09856fc85bdfb78f0a25571fc657c75_050c14f6
SUPABASE_URL=https://bnmxamfjavlwgpaskgik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

## 🔄 Payment Flow

1. **User selects plan** → PricingSelect.tsx
2. **Navigate to payment** → Payment.tsx with query params (plan, amount)
3. **Create order** → API calls `/api/cashfree-create-order`
4. **Load Cashfree SDK** → Loads from https://sdk.cashfree.com/js/v3/cashfree.js
5. **Cashfree checkout** → Opens payment gateway in modal/redirect
6. **Return to app** → Includes order_id in URL query param
7. **Verify payment** → API calls `/api/cashfree-verify-order`
8. **Update subscription** → Upsets into Supabase `subscriptions` table

## 🧪 Testing Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# In another terminal, start Rasa (optional)
rasa run --enable-api --cors "*"
```

### Test Payment Steps
1. Navigate to `http://localhost:5173/pricing`
2. Click "Select Plan" on any paid plan (Starter, Professional, or Enterprise)
3. You'll be redirected to `/payment` page
4. Payment form initializes and Cashfree SDK loads
5. **Use Cashfree test credentials** (when the modal opens):
   - Email: any@email.com
   - Phone: any 10 digit number
   - Card: Use any Cashfree test card

### Test Card Numbers (Sandbox)
- **Success**: 4111 1111 1111 1111
- **Failed**: 4234 5678 9012 3456
- Expiry: Any future date
- CVV: Any 3 digits

## 📊 Database Schema

Your Supabase `subscriptions` table should have:
```sql
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  plan_id TEXT NOT NULL,
  cashfree_order_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Moving to Production

### 1. Update Cashfree Credentials
Get your **production** credentials from https://dashboard.cashfree.com
```
CASHFREE_CLIENT_ID=your_production_client_id
CASHFREE_SECRET_KEY=your_production_secret_key
```

### 2. Update API Endpoint
In `api/cashfree-create-order.js` and `api/cashfree-verify-order.js`:
```javascript
// Change from sandbox
const response = await fetch('https://sandbox.cashfree.com/pg/orders', {

// To production
const response = await fetch('https://api.cashfree.com/pg/orders', {
```

### 3. Update SDK Initialization
In `src/pages/Payment.tsx`:
```javascript
// Change from
const cashfree = window.Cashfree({ mode: 'sandbox' });

// To
const cashfree = window.Cashfree({ mode: 'production' });
```

### 4. Update Vercel Environment Variables
Set these in your Vercel project settings:
- `CASHFREE_CLIENT_ID`
- `CASHFREE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🛠️ Troubleshooting

### "No valid model found at models!" - Rasa
```bash
rasa train
rasa run --enable-api --cors "*"
```

### Payment fails with "Failed to create order"
1. Check console for error details
2. Verify Cashfree credentials in `.env.local`
3. Ensure API is accessible at `/api/cashfree-create-order`

### "CORS" errors
- Vercel handles CORS headers in the API layer
- Local development uses CORS *

### Payment verification always PENDING
- May be a race condition
- Cashfree takes 2-3 seconds to process
- Refresh page or wait a moment

## 📝 Features Included

✅ **Plan Selection** - Multiple tiers (Free, Starter, Professional, Enterprise)
✅ **Secure Checkout** - Cashfree SDK integration
✅ **Order Management** - Create and verify orders
✅ **Database Storage** - Persist subscriptions in Supabase
✅ **Error Handling** - User-friendly error messages
✅ **Dark Mode** - Respects theme preference
✅ **Loading States** - Clear UI feedback during payment

## 🔗 Useful Links

- [Cashfree Docs](https://docs.cashfree.com/)
- [Cashfree Test Credentials](https://docs.cashfree.com/docs/testing)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## ❓ Questions?

Check the implementation:
- `src/pages/Payment.tsx` - Frontend logic
- `api/cashfree-create-order.js` - Order creation
- `api/cashfree-verify-order.js` - Payment verification
