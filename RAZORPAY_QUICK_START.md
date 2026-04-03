# 🚀 Razorpay Integration - Quick Start Checklist

## ✅ What's Already Done

- [x] Replaced Cashfree with Razorpay integration
- [x] Created order creation API (`api/razorpay-create-order.js`)
- [x] Created payment verification API (`api/razorpay-verify-order.js`)
- [x] Updated Payment component with Razorpay SDK
- [x] Installed razorpay npm package
- [x] Updated environment variables template
- [x] Integrated with Supabase for subscription tracking

## 🔧 What You Need to Do

### Step 1: Get Razorpay Credentials (5 mins)
1. Visit https://razorpay.com
2. Sign up and verify your account
3. Go to **Settings > API Keys**
4. Copy **TEST** KEY_ID and KEY_SECRET (for development)

### Step 2: Update Environment Variables (2 mins)
Edit `.env.local` and replace:
```
RAZORPAY_KEY_ID=rzp_test_<paste_your_key_id>
RAZORPAY_KEY_SECRET=<paste_your_key_secret>
```

### Step 3: Test Locally (5 mins)
```bash
npm run dev
```
Then:
1. Go to http://localhost:5173/pricing
2. Click "Select Plan" (e.g., Starter ₹29)
3. Payment modal opens
4. Use test card: **4111 1111 1111 1111**
5. Any future expiry date and CVV

Expected result:
- ✅ Payment succeeds
- ✅ Subscription appears in Supabase
- ✅ Success screen shows

## 📊 Files Modified/Created

| File | Purpose | Status |
|------|---------|--------|
| `src/pages/Payment.tsx` | Payment UI & logic | ✅ Updated |
| `api/razorpay-create-order.js` | Create order | ✅ Created |
| `api/razorpay-verify-order.js` | Verify payment | ✅ Created |
| `.env.local` | API credentials | ✅ Updated |
| `RAZORPAY_SETUP.md` | Full documentation | ✅ Created |

## 🧪 Test Payment

**Successful Payment:**
```
Card: 4111 1111 1111 1111
Expiry: 12/25 (any future date)
CVV: 123
```

**Failed Payment:**
```
Card: 4444 4444 4444 4444
Expiry: 12/25
CVV: 123
```

## 🎯 Production Checklist

When ready to go live:

- [ ] Get KYC verified by Razorpay
- [ ] Get LIVE Key ID and Secret
- [ ] Update Vercel environment variables
- [ ] Switch to production in Payment.tsx (if needed)
- [ ] Test with real payment card
- [ ] Monitor Razorpay dashboard
- [ ] Set up webhook handlers (optional)

## 📞 Support

**Documentation:**
- [Razorpay Docs](https://razorpay.com/docs/)
- [Setup Guide](./RAZORPAY_SETUP.md)

**Test Cards:**
- Successful: 4111 1111 1111 1111
- Failed: 4444 4444 4444 4444

**Common Issues:**
1. "razorpay is not defined" → Run `npm install razorpay`
2. Payment fails → Check KEY_ID/SECRET in .env.local
3. Signature error → Verify KEY_SECRET is correct

## ⏱️ Time to Implementation

- Get credentials: **5 mins**
- Update env vars: **2 mins**
- Test locally: **5 mins**
- **Total: ~12 minutes** ⚡

## 🎉 You're Ready!

Your app now supports real payments. Start with test mode, then switch to production once verified by Razorpay.

Need help? Check `RAZORPAY_SETUP.md` for detailed instructions.
