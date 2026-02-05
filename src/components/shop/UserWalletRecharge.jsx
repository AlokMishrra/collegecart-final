import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Wallet, Gift } from "lucide-react";

export default function UserWalletRecharge({ user, open, onOpenChange, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [100, 200, 500, 1000];

  const handleRecharge = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsProcessing(true);
    try {
      const { createWalletRecharge } = await import("@/functions/createWalletRecharge");
      const response = await createWalletRecharge({
        amount: parseFloat(amount),
        type: "user"
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
          try {
            const { verifyWalletRecharge } = await import("@/functions/verifyWalletRecharge");
            const verifyResponse = await verifyWalletRecharge({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              amount: parseFloat(amount),
              type: "user"
            });

            if (verifyResponse.data.verified) {
              setAmount("");
              onOpenChange(false);
              if (onSuccess) onSuccess();
            }
          } catch (error) {
            console.error("Verification error:", error);
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: user.full_name,
          email: user.email
        },
        theme: {
          color: "#10b981"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Error initiating recharge:", error);
      alert("Failed to initiate payment");
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Add Money to Wallet
          </DialogTitle>
          <DialogDescription>
            Get free delivery on all orders when you pay with wallet!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-medium text-gray-700">Current Balance</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              ₹{(user.wallet_balance || 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Exclusive Benefit:</strong> Pay with wallet and get FREE delivery on all orders!
              </p>
            </div>
          </div>
          
          <div>
            <Label>Select or Enter Amount</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(amt.toString())}
                  className={amount === amt.toString() ? "bg-emerald-100 border-emerald-500" : ""}
                >
                  ₹{amt}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Or enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>Amount to Add:</span>
                <span className="font-bold text-emerald-600">₹{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>New Balance:</span>
                <span className="font-bold text-emerald-600">
                  ₹{((user.wallet_balance || 0) + parseFloat(amount)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
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
              "Pay with Razorpay"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}