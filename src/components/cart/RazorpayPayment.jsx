import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";

export default function RazorpayPayment({ amount, onSuccess, onError, orderNumber }) {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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

    setIsLoading(true);

    try {
      // Create order on backend
      console.log('Creating Razorpay order with amount:', amount, 'receipt:', orderNumber);
      
      const orderResponse = await base44.functions.invoke('createRazorpayOrder', {
        amount: amount,
        receipt: orderNumber
      });

      console.log('Full Order Response:', orderResponse);

      // Parse response data
      let orderData = orderResponse;
      if (orderResponse.data) {
        orderData = orderResponse.data;
      }

      console.log('Parsed Order Data:', orderData);

      // Check for errors
      if (!orderData || orderData.error) {
        throw new Error(orderData?.error || 'Failed to create payment order');
      }

      if (!orderData.orderId) {
        console.error('Missing orderId in response:', orderData);
        throw new Error('Invalid payment order response - missing order ID');
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
            console.log('Payment Success Response:', response);
            
            // Verify payment on backend
            const verifyResponse = await base44.functions.invoke('verifyRazorpayPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            console.log('Verification Response:', verifyResponse);

            // Parse response
            let verificationData = verifyResponse;
            if (verifyResponse.data) {
              verificationData = verifyResponse.data;
            }

            console.log('Parsed Verification Data:', verificationData);

            // Check for errors in verification
            if (verificationData?.error || !verificationData?.success) {
              throw new Error(verificationData?.error || 'Payment verification failed');
            }

            // Payment verified successfully
            console.log('Payment verified successfully:', response.razorpay_payment_id);
            onSuccess(response.razorpay_payment_id);
            
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
            setIsLoading(false);
            onError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      
      // Extract meaningful error message
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
          <p className="text-xs sm:text-sm text-gray-500">Powered by Razorpay - 100% Secure</p>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading || !scriptLoaded}
        className="w-full h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-md disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : !scriptLoaded ? (
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