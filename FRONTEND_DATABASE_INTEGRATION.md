# Frontend-Database Integration Guide
## How Your React Code Works with New SQL Schema

**Purpose**: Show exactly how the frontend subscription system integrates with the database migration  
**Target**: Developers integrating frontend code with backend

---

## 🔗 Integration Map

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/TypeScript)                │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  src/pages/Payment.tsx                                         │
│  ├─ Creates Order via API                                      │
│  ├─ Saves to localStorage first                                │
│  └─ On success: POST /api/cashfree-verify-order               │
│      ↓                                                           │
│  src/contexts/SubscriptionContext.tsx                          │
│  ├─ Loads from localStorage                                    │
│  ├─ Fallback to Supabase (optional)                            │
│  └─ Provides useSubscription() hook                            │
│      ↓                                                           │
│  src/components/Dashboard/UsageStats.tsx                       │
│  └─ Queries: SELECT FROM dashboard_user_stats                 │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                    API ENDPOINTS (Node.js)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  api/cashfree-verify-order.js                                  │
│  ├─ Verify payment with Cashfree                               │
│  └─ INSERT INTO subscriptions                                  │
│      ↓                                                           │
│  api/track-usage.js                                            │
│  └─ SELECT track_usage() function                              │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                   DATABASE (PostgreSQL)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  subscriptions                                                   │
│  ├─ Stores user plans                                          │
│  └─ Triggers sync_subscription_pricing()                       │
│      ↓                                                           │
│  pricing                                                         │
│  ├─ INR prices only                                            │
│  └─ Master source for benefits                                 │
│      ↓                                                           │
│  usage_tracking                                                │
│  ├─ Logs every usage event                                     │
│  └─ Triggers update_usage_summary()                            │
│      ↓                                                           │
│  usage_monthly_summary (View)                                  │
│  └─ Pre-calculated for dashboard                              │
│      ↓                                                           │
│  dashboard_user_stats (View)                                   │
│  └─ All data frontend needs in one query                       │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 📱 Frontend: Payment Flow

### File: `src/pages/Payment.tsx`

**What it does**:
1. Creates payment order
2. Launches Cashfree checkout
3. Verifies payment
4. Saves subscription

**Code flow**:
```typescript
// 1. User clicks upgrade button
navigate('/payment?plan=starter&amount=2499')

// 2. Payment.tsx mounts
// 3. Calls initPayment()
async function initPayment() {
  // POST to API
  const res = await fetch('/api/cashfree-create-order', {
    method: 'POST',
    body: JSON.stringify({
      planId: 'starter',
      amount: 2499,
      userId: user.id,
      userEmail: user.email,
      returnUrl: 'http://localhost:5174/payment?plan=starter&order_id={order_id}'
    })
  })
  
  // Response contains:
  const { orderId, paymentSessionId } = await res.json()
  
  // Launch Cashfree modal
  const cashfree = new window.Cashfree({ mode: 'sandbox' })
  cashfree.checkout({
    paymentSessionId,  // Cashfree session
    returnUrl: finalReturnUrl
  })
  // User enters card details, completes payment
}

// 4. After payment, Cashfree redirects back with ?order_id=...
// 5. Triggers verifyOrder()
async function verifyOrder(orderId) {
  // Call API to verify
  const response = await fetch(
    `/api/cashfree-verify-order?orderId=${orderId}&userId=${user.id}&planId=starter`
  )
  
  const { status } = await response.json()
  
  if (status === 'SUCCESS') {
    // ✨ KEY MOMENT: Save subscription to context
    const { setSubscription } = useSubscription()
    
    const subscriptionData = {
      id: orderId,
      user_id: user.id,
      plan_id: 'starter',
      status: 'active',
      benefits: PLAN_BENEFITS_MAP['starter'],  // From context
      cashfree_order_id: orderId,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setSubscription(subscriptionData)
    // ^ Saves to localStorage automatically
    
    setStage('success')
  }
}
```

**localStorage Result**:
```javascript
// In browser console
localStorage.getItem('fiesta_subscription')
// Returns:
{
  "id": "order_1774600189852_2145bb13",
  "user_id": "2145bb13-c1dd-...",
  "plan_id": "starter",
  "status": "active",
  "benefits": {
    "maxChatbots": 3,
    "maxFaqDocuments": 200,
    "maxApiCalls": 5000,
    "maxTtsCharacters": 5000,
    "maxSttUses": 2000,
    "maxEmailResponses": 2000
  },
  "cashfree_order_id": "order_1774600189852_2145bb13",
  "activated_at": "2026-03-27T12:30:00.000Z",
  "updated_at": "2026-03-27T12:30:00.000Z"
}
```

---

## 🔄 API Endpoints

### File: `api/cashfree-verify-order.js`

**What happens after payment verification**:

```javascript
export default async function handler(req, res) {
  const { orderId, userId, planId } = req.query
  
  // 1. Verify with Cashfree API
  const cashfreeResponse = await verifyCashfreeOrder(orderId)
  
  if (cashfreeResponse.status !== 'PAID') {
    return res.status(400).json({ status: 'FAILED' })
  }
  
  // 2. CREATE subscription in database
  const { data: newSubscription, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,  // 'starter'
      status: 'active',
      cashfree_order_id: orderId,
      activated_at: new Date().toISOString()
      // benefits automatically synced by trigger!
    })
    .select()
    .single()
  
  // Database triggers now execute:
  // 1. sync_subscription_pricing() - Pulls benefits from PRICING table
  // 2. log_subscription_changes() - Records upgrade in change log
  
  // 3. Create first summary record
  await supabase
    .from('usage_monthly_summary')
    .insert({
      user_id: userId,
      subscription_id: newSubscription.id,
      billing_month: getCurrentMonth(),  // '2026-03-01'
      plan_id: planId,
      api_calls_limit: 10000,  // From pricing
      tts_characters_limit: 50000,
      chatbots_limit: 3,
      faq_limit: 10,
      storage_limit_gb: 5
    })
  
  // 4. Optional: Send welcome email
  await sendWelcomeEmail(userEmail, planId)
  
  return res.status(200).json({ status: 'SUCCESS' })
}
```

**What triggers in database**:
```sql
-- After INSERT into subscriptions

-- TRIGGER 1: sync_subscription_pricing()
SELECT benefits FROM pricing WHERE plan_id = 'starter'
-- Returns full benefits object, stores in subscription.benefits

-- TRIGGER 2: log_subscription_changes()
INSERT INTO subscription_change_log
VALUES (user_id, subscription_id, 'created', NULL, 'starter', ...)

-- Result in database:
subscriptions: 1 new row (plan_id='starter', benefits={...})
subscription_change_log: 1 new row (event logged)
subscription_summary: 1 new row (initialized for month)
```

---

## 📊 Frontend: Dashboard Usage Display

### File: `src/components/Dashboard/UsageStats.tsx`

**What it does**:
1. Loads current month's usage from database
2. Displays against plan limits
3. Shows percentage used

**Code**:
```typescript
export default function UsageStats() {
  const { user } = useAuth()
  const { benefits } = useSubscription()
  
  useEffect(() => {
    async function loadUsageStats() {
      // Query the dashboard_user_stats view
      const { data: stats, error } = await supabase
        .from('dashboard_user_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('billing_month', CURRENT_DATE)  // '2026-03-01'
        .single()
      
      // Data includes:
      // {
      //   api_calls_used: 423,          <- From usage_tracking aggregated
      //   api_calls_limit: 10000,       <- From pricing
      //   api_calls_percentage: 4.23,   <- Auto-calculated
      //   tts_characters_used: 2500,
      //   tts_characters_limit: 50000,
      //   tts_characters_percentage: 5.00,
      //   ...
      // }
      
      setUsageStats(stats)
    }
    
    loadUsageStats()
  }, [user])
  
  return (
    <div>
      {/* API Calls Usage */}
      <div>
        <span>{stats.api_calls_used} / {stats.api_calls_limit}</span>
        <ProgressBar percentage={stats.api_calls_percentage} />
        <span>{stats.api_calls_percentage}%</span>
      </div>
      
      {/* TTS Characters */}
      <div>
        <span>{stats.tts_characters_used} / {stats.tts_characters_limit}</span>
        <ProgressBar percentage={stats.tts_characters_percentage} />
        <span>{stats.tts_characters_percentage}%</span>
      </div>
    </div>
  )
}
```

**SQL executed**:
```sql
-- Single query to get all dashboard data
SELECT 
  api_calls_used,
  api_calls_limit,
  api_calls_percentage,
  tts_characters_used,
  tts_characters_limit,
  tts_characters_percentage,
  storage_used_gb,
  storage_limit_gb,
  storage_percentage,
  plan_name,
  price_inr,
  status,
  billing_month
FROM dashboard_user_stats
WHERE user_id = '2145bb13-c1dd-...'
AND billing_month = '2026-03-01'
LIMIT 1;
```

---

## 📝 Adding Usage Tracking

### When User Makes API Call

**File**: Your API endpoint handler

```typescript
// In your chatbot API handler
async function handleChatbotMessage(req, res) {
  const { userId, message } = req.body
  
  // 1. Check if user has API calls left
  const { data: userStats } = await supabase
    .from('dashboard_user_stats')
    .select('api_calls_used, api_calls_limit')
    .eq('user_id', userId)
    .single()
  
  if (userStats.api_calls_used >= userStats.api_calls_limit) {
    return res.status(429).json({ error: 'API call limit exceeded' })
  }
  
  // 2. Make API call
  const response = await callOpenAI(message)
  
  // 3. TRACK THE USAGE
  const { data: trackingResult, error } = await supabase.rpc('track_usage', {
    user_id_param: userId,
    usage_type_param: 'api_call',
    amount_param: 1,
    resource_id_param: 'gpt_call_' + Date.now(),
    metadata_param: {
      model: 'gpt-4',
      tokens: response.usage.total_tokens,
      duration_ms: Date.now() - startTime
    }
  })
  
  return res.status(200).json({
    response: response.content,
    usage_tracked: true
  })
}
```

**What happens in database**:
```sql
-- Function call
SELECT track_usage(
  user_id := '2145bb13-c1dd-...',
  usage_type_param := 'api_call',
  amount_param := 1,
  ...
)

-- Executes:
INSERT INTO usage_tracking (
  user_id, subscription_id, usage_type, amount, 
  billing_month, tracked_date, created_at
) VALUES (
  '2145bb13-c1dd-...',
  'sub_id_from_active_subscription',
  'api_call',
  1,
  '2026-03-01',
  '2026-03-27',
  NOW()
)

-- TRIGGER: update_usage_summary() fires
UPDATE usage_monthly_summary
SET api_calls_used = api_calls_used + 1,
    api_calls_percentage = (api_calls_used / api_calls_limit) * 100,
    updated_at = NOW()
WHERE user_id = '2145bb13-c1dd-...'
AND billing_month = '2026-03-01'

-- Result: Dashboard immediately shows +1 usage
```

---

## 💰 Pricing Display (Same for All Users)

### File: `src/pages/PricingSelect.tsx`

```typescript
export default function PricingSelect() {
  const [plans, setPlans] = useState([])
  
  useEffect(() => {
    async function loadPricing() {
      // Query PRICING table - same for everyone
      const { data: pricingData } = await supabase
        .from('pricing')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      setPlans(pricingData)
      // Result:
      // [
      //   { plan_id: 'free', price_inr: 0, plan_name: 'Free', ... },
      //   { plan_id: 'starter', price_inr: 2499, ... },
      //   { plan_id: 'professional', price_inr: 8499, ... },
      //   { plan_id: 'enterprise', price_inr: 25999, ... }
      // ]
    }
    
    loadPricing()
  }, [])
  
  return (
    <div>
      {plans.map(plan => (
        <PlanCard
          key={plan.plan_id}
          name={plan.plan_name}
          price={plan.price_inr}  // Always INR
          benefits={[
            `${plan.max_chatbots} Chatbots`,
            `${plan.max_api_calls} API Calls/month`,
            `${plan.max_tts_characters} TTS Characters`,
            `${plan.storage_gb} GB Storage`,
            plan.has_analytics && 'Analytics',
            plan.has_priority_support && 'Priority Support',
            plan.has_custom_branding && 'Custom Branding',
            plan.has_custom_domain && 'Custom Domain'
          ]}
          onSelect={() => handlePlanSelect(plan)}
        />
      ))}
    </div>
  )
}
```

**Key points**:
- ✅ Same query for logged-in and anonymous users
- ✅ All prices in INR only (price_inr field)
- ✅ No regional pricing variations
- ✅ Benefits always match database

---

## 🔐 Subscription Context: The Glue

### File: `src/contexts/SubscriptionContext.tsx`

**Function**: Bridges localStorage and database

```typescript
export function SubscriptionProvider({ children, userId }) {
  const [subscription, setSubscriptionState] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const loadSubscription = async () => {
    if (!userId) return
    
    // 1. Try localStorage first (offline mode)
    const stored = localStorage.getItem('fiesta_subscription')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.user_id === userId) {
        setSubscriptionState(parsed)
        setLoading(false)
        return  // Use cached version
      }
    }
    
    // 2. Fallback to database (sync mode)
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    
    if (data) {
      setSubscriptionState(data)
      localStorage.setItem('fiesta_subscription', JSON.stringify(data))
    }
  }
  
  const setSubscription = (sub) => {
    // Save to both localStorage AND database
    localStorage.setItem('fiesta_subscription', JSON.stringify(sub))
    setSubscriptionState(sub)
    
    // Also save to database for persistence
    if (sub) {
      supabase.from('subscriptions').insert(sub).catch(console.error)
    }
  }
  
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        planId: subscription?.plan_id || 'free',
        benefits: subscription?.benefits || DEFAULT_FREE_BENEFITS,
        loading,
        setSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}
```

**Usage in components**:
```typescript
function MyComponent() {
  const { planId, benefits, loading } = useSubscription()
  
  if (loading) return <div>Loading plan...</div>
  
  return (
    <div>
      Current plan: {planId}  // 'starter'
      API limit: {benefits.maxApiCalls}  // 10000
    </div>
  )
}
```

---

## 🔄 Complete User Journey

### 1. Free User Signs Up
```
User creates account
  ↓
Auth.users table gains new row
  ↓
SubscriptionProvider initializes
  ↓
No subscription found
  ↓
Defaults to FREE plan
  ↓
Dashboard shows:
- Plan: Free (₹0)
- API Calls: 0 / 1000
- TTS: 0 / 5000
```

### 2. User Upgrades to Starter
```
User clicks "Upgrade Plan"
  ↓
Navigate to /pricing-select
  ↓
Sees plans with INR prices:
- Free: ₹0
- Starter: ₹2,499
- Professional: ₹8,499
- Enterprise: ₹25,999
  ↓
Selects Starter
  ↓
Navigate to /payment?plan=starter&amount=2499
  ↓
Payment.tsx mounts
  ↓
initPayment(): POST /api/cashfree-create-order
  ↓
Cashfree modal opens
  ↓
User enters card (4111 1111 1111 1111 for test)
  ↓
Payment succeeds
  ↓
Cashfree redirects with ?order_id=...
  ↓
verifyOrder() called
  ↓
Saves to localStorage
  ↓
Database INSERT subscriptions row
  ↓
Triggers fire:
- sync_subscription_pricing(): Loads benefits from PRICING
- log_subscription_changes(): Records upgrade
  ↓
Navigation to /dashboard
  ↓
Dashboard shows:
- Plan: Starter (₹2,499/month)
- API Calls: 0 / 10000
- TTS: 0 / 50000
- Storage: 0 / 5 GB
- Features: Analytics ✓
```

### 3. User Makes API Call
```
Chatbot API endpoint called
  ↓
Check: api_calls_used < api_calls_limit
  ↓
Make OpenAI request
  ↓
Log usage: track_usage('api_call', 1)
  ↓
INSERT usage_tracking row
  ↓
Trigger: update_usage_summary()
  ↓
UPDATE usage_monthly_summary:
api_calls_used = 1
api_calls_percentage = (1 / 10000) * 100 = 0.01%
  ↓
Next dashboard load:
- API Calls: 1 / 10000 (0.01%)
```

---

## 📋 Integration Checklist

- [ ] Run database migration script
- [ ] Verify all 7 tables created
- [ ] Deploy updated `src/contexts/SubscriptionContext.tsx`
- [ ] Deploy updated `src/pages/Payment.tsx`
- [ ] Deploy updated `src/pages/PricingSelect.tsx`
- [ ] Deploy updated `src/components/Dashboard/UsageStats.tsx`
- [ ] Deploy updated `api/cashfree-verify-order.js`
- [ ] Add tracking in your API endpoints
- [ ] Test payment flow with test card
- [ ] Verify usage shows on dashboard
- [ ] Check pricing displays in INR only
- [ ] Test downgrade prevention on /pricing-select
- [ ] Monitor database for concurrent usage safety

---

## ✅ Success Indicators

After integration:

1. **Payment works**
   ```
   User completes payment → subscription created in DB
   localStorage shows subscription data
   ```

2. **Dashboard shows correct plan**
   ```
   Professional user → Dashboard shows "Professional Plan (₹8,499/month)"
   ```

3. **Usage tracking works**
   ```
   Make API call → api_calls_used increments
   Dashboard updates without refresh
   ```

4. **Pricing consistency**
   ```
   Everyone sees: Starter ₹2,499 (never changes)
   All in INR only
   ```

5. **Downgrade prevention**
   ```
   Professional user on /pricing-select
   Free & Starter buttons disabled with lock icon
   Only Enterprise upgrade button enabled
   ```

---

## 🚀 You're Ready!

All pieces are connected:
- ✅ Frontend pays via Cashfree
- ✅ Subscription saved to database
- ✅ Usage tracked concurrently
- ✅ Dashboard shows real data
- ✅ Pricing consistent in INR only
- ✅ Safe for production scale

Run the migration and deploy the frontend code!

---

**Last Updated**: March 27, 2026  
**Status**: ✅ Ready for Production
