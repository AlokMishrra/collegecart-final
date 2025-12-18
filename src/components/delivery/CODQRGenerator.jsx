import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle } from "lucide-react";

export default function CODQRGenerator({ order, onPaymentReceived }) {
  const [isPaid, setIsPaid] = useState(false);

  const handleMarkAsPaid = () => {
    setIsPaid(true);
    if (onPaymentReceived) {
      onPaymentReceived(order.id);
    }
  };

  if (order.payment_method !== "cash") return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" />
          COD QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cash on Delivery - QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Order #{order.order_number}</p>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              ₹{order.total_amount.toFixed(2)}
            </p>
            
            {!isPaid ? (
              <>
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=7248316506@okbizaxis%26pn=CollegeCart%26am=${order.total_amount.toFixed(2)}%26cu=INR%26tn=Order${order.order_number}`}
                    alt="Payment QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Customer can scan to pay via UPI
                </p>
                <Button
                  onClick={handleMarkAsPaid}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
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