import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, CreditCard } from "lucide-react";

export default function CODQRGenerator({ order, onPaymentReceived }) {
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initiateRazorpayPayment = async () => {
    try {
      setIsProcessingPayment(true);

      // Create Razorpay order
      const { data: razorpayOrderData } = await base44.functions.invoke('createRazorpayOrder', {
        amount: order.total_amount,
        currency: 'INR',
        receipt: order.order_number
      });

      if (!razorpayOrderData.orderId) {
        throw new Error('Failed to create payment order');
      }

      // Initialize Razorpay checkout
      const options = {
        key: razorpayOrderData.keyId,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        name: 'CollegeCart',
        description: `Order #${order.order_number}`,
        order_id: razorpayOrderData.orderId,
        prefill: {
          name: order.customer_name,
          contact: order.phone_number
        },
        theme: {
          color: '#10b981'
        },
        handler: async function (response) {
          try {
            // Verify payment
            const { data: verificationData } = await base44.functions.invoke('verifyRazorpayPayment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verificationData.verified) {
              // Mark order as paid
              await base44.entities.Order.update(order.id, { 
                is_paid: true,
                razorpay_payment_id: response.razorpay_payment_id
              });
              setIsPaid(true);
              if (onPaymentReceived) {
                onPaymentReceived(order.id);
              }
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
          setIsProcessingPayment(false);
        },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      alert('Unable to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await base44.entities.Order.update(order.id, { is_paid: true });
      setIsPaid(true);
      if (onPaymentReceived) {
        onPaymentReceived(order.id);
      }
    } catch (error) {
      console.error("Error marking order as paid:", error);
    }
  };

  if (order.payment_method !== "cash") return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" />
          {isPaid ? "Paid ✓" : "Collect Payment"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Order #{order.order_number}</p>
            <p className="text-3xl font-bold text-emerald-600 mb-4">
              ₹{order.total_amount.toFixed(2)}
            </p>
            
            {!isPaid ? (
              <>
                <div className="space-y-3">
                  <Button
                    onClick={initiateRazorpayPayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isProcessingPayment ? "Opening Payment..." : "Pay via Razorpay"}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-50 px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleMarkAsPaid}
                    variant="outline"
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Cash Paid
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  UPI, Cards, Net Banking via Razorpay
                </p>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">Payment Received!</p>
                <p className="text-sm text-green-600 mt-1">
                  Order #{order.order_number} has been paid
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Customer:</strong> {order.customer_name}</p>
            <p><strong>Phone:</strong> {order.phone_number}</p>
            <p><strong>Address:</strong> {order.delivery_address}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}