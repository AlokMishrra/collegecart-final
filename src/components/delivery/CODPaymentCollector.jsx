import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, QrCode, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CODPaymentCollector({ order, deliveryPerson, onPaymentSuccess }) {
  const [showDialog, setShowDialog] = useState(false);
  const [method, setMethod] = useState(null); // "qr" or "cash"
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkAsPaid = async () => {
    setIsUpdating(true);
    try {
      // Collect COD: wallet becomes negative (owes cash to store)
      const collectedAmount = order.total_amount;
      const newBalance = (deliveryPerson.wallet_balance || 0) - collectedAmount;

      await Promise.all([
        base44.entities.Order.update(order.id, { is_paid: true }),
        base44.entities.DeliveryPerson.update(deliveryPerson.id, { wallet_balance: newBalance }),
        base44.entities.WalletTransaction.create({
          delivery_person_id: deliveryPerson.id,
          amount: -collectedAmount,
          type: "cod_collection",
          description: `Collected COD ₹${collectedAmount.toFixed(2)} for order #${order.order_number}`,
          balance_after: newBalance
        }),
        base44.entities.Notification.create({
          user_id: order.user_id,
          title: "Payment Received",
          message: `Payment of ₹${order.total_amount.toFixed(2)} received for order #${order.order_number}`,
          type: "success"
        })
      ]);

      setShowDialog(false);
      if (onPaymentSuccess) onPaymentSuccess(newBalance);
    } catch (error) {
      console.error("Error updating payment:", error);
    }
    setIsUpdating(false);
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
        onClick={() => { setMethod(null); setShowDialog(true); }}
        variant="outline"
        className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Collect COD Payment
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle>Collect Payment</DialogTitle>
            </div>
          </DialogHeader>
          <div className="bg-gray-50 rounded-lg p-3 mb-2">
            <p className="font-semibold text-gray-900 text-sm">Order #{order.order_number}</p>
            <p className="text-xs text-gray-600">{order.customer_name}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{order.total_amount.toFixed(2)}</p>
          </div>

          {!method ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Choose collection method:</p>
              <Button
                onClick={() => setMethod("qr")}
                variant="outline"
                className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show UPI QR Code
              </Button>
              <Button
                onClick={() => setMethod("cash")}
                variant="outline"
                className="w-full justify-start border-green-300 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Collect Cash
              </Button>
            </div>
          ) : method === "qr" ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">Customer scans to pay via UPI</p>
              <div className="bg-white p-3 rounded-lg inline-block border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=8521282690@okbizaxis%26pn=CollegeCart%26am=${order.total_amount.toFixed(2)}%26cu=INR%26tn=Order${order.order_number}`}
                  alt="UPI QR"
                  className="w-44 h-44"
                />
              </div>
              <p className="text-xs text-gray-500">UPI: 8521282690@okbizaxis</p>
              <Button
                onClick={handleMarkAsPaid}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? "Updating..." : "Customer Paid ✓"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMethod(null)} className="w-full text-gray-500">Back</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Collect ₹{order.total_amount.toFixed(2)} cash from customer. This will be recorded in your wallet.
              </div>
              <Button
                onClick={handleMarkAsPaid}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? "Updating..." : "Cash Collected ✓"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMethod(null)} className="w-full text-gray-500">Back</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}