import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";

export default function RazorpayPayment({ amount, onSuccess, onError, orderNumber }) {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  useEffect(() => {
    // Pre-load Razorpay script for faster checkout
    const loadRazorpayScript = () => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        setScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => setScriptLoaded(false);
      document.body.appendChild(script);
    };
    loadRazorpayScript();
  }, []);

  const handlePayment = async () => {
    if (!scriptLoaded) {
      onError('Payment system is loading, please try again');
      return;
    }

    if (paymentInitiated) {
      return; // Prevent duplicate clicks
    }

    setIsLoading(true);
    setPaymentInitiated(true);

    try {
      console.log('Creating Razorpay order for amount:', amount);
      
      // Create order on backend
      const { data: orderData } = await base44.functions.invoke('createRazorpayOrder', {
        amount: amount,
        receipt: orderNumber
      });

      console.log('Razorpay order created:', orderData);

      if (!orderData.orderId) {
        throw new Error('Failed to create payment order');
      }

      // Razorpay options with CollegeCart branding
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CollegeCart',
        description: `Order ${orderNumber}`,
        image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg',
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            console.log('Payment successful, verifying...', response);
            
            // Verify payment on backend
            const { data: verificationData } = await base44.functions.invoke('verifyRazorpayPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            console.log('Verification response:', verificationData);

            if (verificationData.success) {
              // Keep loading state active while order is being created
              onSuccess(response.razorpay_payment_id);
            } else {
              setIsLoading(false);
              onError('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setIsLoading(false);
            onError(error.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed by user');
            setIsLoading(false);
            setPaymentInitiated(false);
            onError('Payment cancelled by user');
          }
        }
      };

      console.log('Opening Razorpay payment modal...');
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed event:', response.error);
        setIsLoading(false);
        setPaymentInitiated(false);
        onError(response.error.description || 'Payment failed. Please try again.');
      });

      razorpay.open();
      setIsLoading(false); // Reset loading after modal opens

    } catch (error) {
      console.error('Payment initialization error:', error);
      onError(error.message || 'Failed to initialize payment. Please try again.');
      setIsLoading(false);
      setPaymentInitiated(false);
    }
  };

  return (
    <div className="w-full max-w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-3 sm:p-6 shadow-lg animate-pulse-slow">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 p-1.5 shadow-sm">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg"
            alt="CollegeCart"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">💳 Complete Payment</h3>
          <p className="text-xs sm:text-sm text-gray-600">Click below to pay securely</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-lg p-4 mb-4 border border-blue-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm sm:text-base text-gray-600 font-medium">Total Amount:</span>
          <span className="text-2xl sm:text-3xl font-bold text-blue-600">₹{amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 rounded p-2">
          <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p>100% Secure Payment via Razorpay</p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded p-2">
          <span>✓ UPI</span>
          <span>✓ Cards</span>
          <span>✓ Wallets</span>
          <span>✓ NetBanking</span>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading || !scriptLoaded || paymentInitiated}
        className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base sm:text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading || paymentInitiated ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-spin" />
            Opening Payment Gateway...
          </>
        ) : !scriptLoaded ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-spin" />
            Loading Payment System...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Proceed to Pay ₹{amount.toFixed(2)}
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-gray-500 mt-3">
        You'll be redirected to Razorpay's secure payment page
      </p>
    </div>
  );
}