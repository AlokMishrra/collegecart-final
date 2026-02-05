import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function WalletRecharge({ deliveryPerson, onSuccess, open, onOpenChange }) {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecharge = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsProcessing(true);
    try {
      const { createWalletRecharge } = await import("@/functions/createWalletRecharge");
      const response = await createWalletRecharge({
        amount: parseFloat(amount),
        type: "delivery",
        deliveryPersonId: deliveryPerson.id
      });

      if (!response.data.success) {
        throw new Error("Failed to create recharge order");
      }

      const options = {
        key: response.data.key,
        amount: response.data.amount,
        currency: response.data.currency,
        order_id: response.data.orderId,
        name: "CollegeCart",
        description: "Wallet Recharge",
        handler: async (razorpayResponse) => {
          setIsProcessing(true);
          try {
            const { verifyWalletRecharge } = await import("@/functions/verifyWalletRecharge");
            const verifyResponse = await verifyWalletRecharge({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              amount: parseFloat(amount),
              type: "delivery",
              deliveryPersonId: deliveryPerson.id
            });

            if (verifyResponse.data.verified) {
              alert(`₹${parseFloat(amount).toFixed(2)} added successfully!`);
              setAmount("");
              setIsProcessing(false);
              onOpenChange(false);
              onSuccess();
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error("Verification error:", error);
            alert("Payment verification failed. Please contact support.");
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: deliveryPerson.name,
          email: deliveryPerson.email,
          contact: deliveryPerson.phone_number
        },
        theme: {
          color: "#10b981"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setIsProcessing(false);
        alert('Payment failed. Please try again.');
      });
      
      rzp.open();
      setIsProcessing(false);
    } catch (error) {
      console.error("Error initiating recharge:", error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>💰 Add Money to Wallet</DialogTitle>
          <DialogDescription>
            Add funds to your wallet to collect COD payments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current Balance</p>
            <p className={`text-2xl font-bold ${(deliveryPerson.account_balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{(deliveryPerson.account_balance || 0).toFixed(2)}
            </p>
          </div>
          
          <div>
            <Label>Amount to Add *</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>New Balance:</span>
                <span className="font-bold text-emerald-600">
                  ₹{((deliveryPerson.account_balance || 0) + parseFloat(amount)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Note:</strong> Payment via Razorpay. COD collections will be deducted from this balance.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRecharge}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}