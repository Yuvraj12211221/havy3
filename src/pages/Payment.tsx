import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, PLAN_BENEFITS_MAP } from '../contexts/SubscriptionContext';

type Stage = 'initializing' | 'launching' | 'verifying' | 'success' | 'failed' | 'error';

declare global {
  interface Window {
    Cashfree: any;
  }
}

function loadCashfreeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSubscription } = useSubscription();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  // ✅ FIXED PARAMS - accept both 'plan' and 'planId'
  const planId = searchParams.get('plan') || searchParams.get('planId') || 'starter';
  const amount = searchParams.get('amount') || '0';
  const returnedOrderId = searchParams.get('order_id');

  const [stage, setStage] = useState<Stage>('initializing');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const didVerify = useRef(false);

  // VERIFY FLOW
  useEffect(() => {
    if (!returnedOrderId || didVerify.current) return;
    didVerify.current = true;
    verifyOrder(returnedOrderId);
  }, [returnedOrderId]);

  // INIT PAYMENT
  useEffect(() => {
    if (returnedOrderId) return;
    if (!user) return;

    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    initPayment();
  }, [user]);

  async function initPayment() {
    try {
      setStage('initializing');

      // Compute return URL
      const returnUrl = `${window.location.origin}/payment?plan=${planId}&amount=${amount}&order_id=PLACEHOLDER`;

      // Create order via API
      const res = await fetch('/api/cashfree-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          amount: Number(amount),
          userId: user?.id,
          userEmail: user?.email,
          returnUrl: returnUrl.replace('PLACEHOLDER', '{order_id}'), // Let Cashfree fill in order_id
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Order creation failed');

      const { orderId: newOrderId, paymentSessionId } = orderData;
      setOrderId(newOrderId);

      setStage('launching');
      await loadCashfreeSDK();

      const cashfree = new window.Cashfree({ mode: 'sandbox' });

      const finalReturnUrl = returnUrl.replace('PLACEHOLDER', newOrderId);

      console.log('💳 Initializing Cashfree checkout with:', {
        paymentSessionId: paymentSessionId,
        returnUrl: finalReturnUrl,
      });

      cashfree.checkout({
        paymentSessionId,
        returnUrl: finalReturnUrl,
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setStage('error');
    }
  }

  async function verifyOrder(oid: string) {
    try {
      setStage('verifying');

      const res = await fetch(
        `/api/cashfree-verify-order?orderId=${oid}&userId=${user?.id}&planId=${planId}`
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.status === 'SUCCESS') {
        setOrderId(oid);
        // ✅ Save subscription to localStorage on successful payment
        const benefits = PLAN_BENEFITS_MAP[planId] || PLAN_BENEFITS_MAP['starter'];
        const subscriptionData = {
          id: oid,
          user_id: user?.id,
          plan_id: planId,
          status: 'active' as const,
          benefits,
          cashfree_order_id: oid,
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSubscription(subscriptionData);
        setStage('success');
      } else {
        setStage('failed');
        setErrorMsg('Payment failed or cancelled');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setStage('error');
    }
  }

  const handleGoBack = () => {
    navigate('/pricing');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="w-full max-w-md">
        <div className={`rounded-lg shadow-lg p-8 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          {/* Loading/Initializing */}
          {stage === 'initializing' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Preparing Payment
              </h2>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Setting up your order...
              </p>
            </div>
          )}

          {/* Launching */}
          {stage === 'launching' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Opening Payment Gateway
              </h2>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Redirecting to Cashfree...
              </p>
            </div>
          )}

          {/* Verifying */}
          {stage === 'verifying' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Verifying Payment
              </h2>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Confirming your transaction...
              </p>
            </div>
          )}

          {/* Success */}
          {stage === 'success' && (
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Payment Successful!
                </h2>
                <p className={`text-lg mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your {planId} plan is now active
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Order ID: {orderId}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Failed */}
          {stage === 'failed' && (
            <div className="text-center space-y-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Payment Failed
                </h2>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {errorMsg || 'Your payment could not be processed'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoBack}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Back to Pricing
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="text-center space-y-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Something Went Wrong
                </h2>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {errorMsg || 'An unexpected error occurred'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleGoBack}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Back to Pricing
                </button>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className={`mt-8 p-4 rounded-lg flex items-start gap-3 ${
            isDark ? 'bg-gray-800/50' : 'bg-blue-50'
          }`}>
            <ShieldCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your payment is processed securely by Cashfree. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;