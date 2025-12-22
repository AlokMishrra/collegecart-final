import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

export default function RazorpayPayment({ amount, onSuccess, onError, orderNumber }) {
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

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
            onError(error.message);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#10b981' // Emerald color matching CollegeCart branding
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            onError('Payment cancelled by user');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      onError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Secure Online Payment</h3>
          <p className="text-sm text-gray-600">Pay with Cards, UPI, Wallet & More</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 border border-emerald-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Amount to Pay:</span>
          <span className="text-2xl font-bold text-emerald-600">₹{amount.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500">Powered by Razorpay - 100% Secure</p>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-md"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay ₹{amount.toFixed(2)}
          </>
        )}
      </Button>

      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
        <img src="https://cdn.razorpay.com/static/assets/pay_methods_branding/card.svg" alt="Cards" className="h-5" />
        <img src="https://cdn.razorpay.com/static/assets/pay_methods_branding/upi.svg" alt="UPI" className="h-5" />
        <img src="https://cdn.razorpay.com/static/assets/pay_methods_branding/wallet.svg" alt="Wallet" className="h-5" />
        <img src="https://cdn.razorpay.com/static/assets/pay_methods_branding/nb.svg" alt="Net Banking" className="h-5" />
      </div>
    </div>
  );
}