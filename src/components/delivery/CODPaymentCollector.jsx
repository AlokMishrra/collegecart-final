import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, Loader2, CheckCircle, QrCode } from "lucide-react";
import RazorpayPayment from "../cart/RazorpayPayment";
import { base44 } from "@/api/base44Client";

export default function CODPaymentCollector({ order, onPaymentSuccess }) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePaymentSuccess = async (paymentId) => {
    setIsUpdating(true);
    try {
      // Update order to mark as paid
      await base44.entities.Order.update(order.id, {
        is_paid: true,
        payment_method: "online"
      });

      // Notify customer
      await base44.entities.Notification.create({
        user_id: order.user_id,
        title: "Payment Received",
        message: `Payment of ₹${order.total_amount.toFixed(2)} received for order #${order.order_number}`,
        type: "success"
      });

      setShowPaymentDialog(false);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
    setIsUpdating(false);
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
  };

  if (order.is_paid) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium">Payment Received</span>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowPaymentDialog(true)}
        variant="outline"
        className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Collect COD Payment
      </Button>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Collect Payment</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900 mb-1">Order #{order.order_number}</p>
                <p className="text-sm text-gray-600">{order.customer_name}</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">₹{order.total_amount.toFixed(2)}</p>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Ask the customer to complete payment using the secure Razorpay checkout below.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RazorpayPayment
              amount={order.total_amount}
              orderNumber={order.order_number}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />

            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="w-full"
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}