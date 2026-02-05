import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";

export default function CashfreePayment({ 
  amount, 
  onSuccess, 
  onError, 
  orderNumber,
  customerName,
  customerPhone,
  customerEmail 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [cashfree, setCashfree] = useState(null);

  useEffect(() => {
    // Load Cashfree SDK from CDN
    const loadCashfreeScript = () => {
      if (document.querySelector('script[src*="cashfree"]')) {
        if (window.Cashfree) {
          setCashfree(window.Cashfree);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => {
        if (window.Cashfree) {
          setCashfree(window.Cashfree);
        } else {
          console.error('Cashfree SDK not available');
          onError('Payment system initialization failed');
        }
      };
      script.onerror = () => {
        console.error('Failed to load Cashfree SDK');
        onError('Payment system initialization failed');
      };
      document.body.appendChild(script);
    };

    loadCashfreeScript();
  }, []);

  const handlePayment = async () => {
    if (!cashfree) {
      onError('Payment system is still loading, please wait');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Creating Cashfree order...');
      
      // Create order on backend
      const orderResponse = await base44.functions.invoke('createCashfreeOrder', {
        amount: amount,
        orderNumber: orderNumber,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail
      });

      console.log('Order created:', orderResponse);

      let orderData = orderResponse;
      if (orderResponse.data) {
        orderData = orderResponse.data;
      }

      if (!orderData || orderData.error) {
        throw new Error(orderData?.error || 'Failed to create payment order');
      }

      if (!orderData.paymentSessionId) {
        throw new Error('Invalid payment session');
      }

      // Initialize Cashfree checkout
      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        returnUrl: `https://collegecart.base44.app/Orders?order_id=${orderNumber}`,
        redirectTarget: "_modal"
      };

      console.log('Opening Cashfree checkout...');

      // Open Cashfree payment modal
      const cashfreeInstance = cashfree({ mode: "production" });
      cashfreeInstance.checkout(checkoutOptions).then(async (result) => {
        if (result.error) {
          console.error('Payment error:', result.error);
          setIsLoading(false);
          onError(result.error.message || 'Payment failed');
          return;
        }

        if (result.paymentDetails) {
          console.log('Payment completed, verifying...');
          
          // Verify payment
          try {
            const verifyResponse = await base44.functions.invoke('verifyCashfreePayment', {
              orderId: orderData.orderId
            });

            let verificationData = verifyResponse;
            if (verifyResponse.data) {
              verificationData = verifyResponse.data;
            }

            if (verificationData?.success) {
              console.log('Payment verified successfully');
              onSuccess(orderData.orderId);
            } else {
              throw new Error(verificationData?.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Verification error:', error);
            setIsLoading(false);
            onError(error.message || 'Payment verification failed');
          }
        }
      }).catch((error) => {
        console.error('Checkout error:', error);
        setIsLoading(false);
        onError('Payment cancelled or failed');
      });

    } catch (error) {
      console.error('Payment initialization error:', error);
      
      let errorMessage = 'Payment failed';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-3 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 p-1.5">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg"
            alt="CollegeCart"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Secure Online Payment</h3>
          <p className="text-xs sm:text-sm text-gray-600">Pay with Cards, UPI, Wallet & More</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-lg p-4 mb-4 border border-emerald-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm sm:text-base text-gray-600">Amount to Pay:</span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600">₹{amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          <p className="text-xs sm:text-sm text-gray-500">Powered by Cashfree - 100% Secure</p>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading || !cashfree}
        className="w-full h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-md disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : !cashfree ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Pay ₹{amount.toFixed(2)}
          </>
        )}
      </Button>
    </div>
  );
}