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
      const { data: orderData } = await base44.functions.invoke('createRazorpayOrder', {
        amount: amount,
        receipt: orderNumber
      });

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
            // Verify payment on backend
            const { data: verificationData } = await base44.functions.invoke('verifyRazorpayPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verificationData.success) {
              onSuccess(response.razorpay_payment_id);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            setIsLoading(false);
            onError(error.message);
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
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-start sm:items-center gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 p-1.5">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg"
            alt="CollegeCart"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Secure Online Payment</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Pay with Cards, UPI, Wallet & More</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 border border-emerald-100">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm sm:text-base text-gray-600">Amount to Pay:</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600">₹{amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <Shield className="w-3 h-3 text-gray-400" />
          <p className="text-xs text-gray-500">Powered by Razorpay - 100% Secure</p>
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

      <div className="mt-3 sm:mt-4 px-2">
        <p className="text-xs text-gray-500 text-center mb-3">Accepted Payment Methods</p>
        
        {/* Main Payment Methods - Cards, UPI, Wallet, Net Banking */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="flex items-center justify-center h-12 bg-white rounded-lg border border-gray-200 p-2">
            <img 
              src="https://cdn.razorpay.com/static/assets/pay_methods_branding/card.svg" 
              alt="Cards" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-12 bg-white rounded-lg border border-gray-200 p-2">
            <img 
              src="https://cdn.razorpay.com/static/assets/pay_methods_branding/upi.svg" 
              alt="UPI" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-12 bg-white rounded-lg border border-gray-200 p-2">
            <img 
              src="https://cdn.razorpay.com/static/assets/pay_methods_branding/wallet.svg" 
              alt="Wallet" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-12 bg-white rounded-lg border border-gray-200 p-2">
            <img 
              src="https://cdn.razorpay.com/static/assets/pay_methods_branding/nb.svg" 
              alt="Net Banking" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
        
        {/* UPI Apps - Google Pay, PhonePe, Paytm, UPI */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex items-center justify-center h-10 bg-white rounded border border-gray-200 p-1.5">
            <img 
              src="https://logos-world.net/wp-content/uploads/2020/11/Google-Pay-Logo.png" 
              alt="Google Pay" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-10 bg-white rounded border border-gray-200 p-1.5">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" 
              alt="PhonePe" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-10 bg-white rounded border border-gray-200 p-1.5">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png" 
              alt="Paytm" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex items-center justify-center h-10 bg-white rounded border border-gray-200 p-1.5">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Bhim-upi-logo.png/1200px-Bhim-upi-logo.png" 
              alt="BHIM UPI" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}