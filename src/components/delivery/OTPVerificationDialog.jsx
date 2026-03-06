import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";

export default function OTPVerificationDialog({ open, onClose, onVerify, order, isLoading }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    if (!otp.trim()) { setError("Please enter the OTP"); return; }
    if (otp.trim() === order?.delivery_otp) {
      setError("");
      setOtp("");
      onVerify();
    } else {
      setError("Incorrect OTP. Ask the customer to check their Orders page.");
    }
  };

  const handleClose = () => {
    setOtp("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Enter Delivery OTP</DialogTitle>
              <p className="text-sm text-gray-500">Ask customer for their OTP</p>
            </div>
          </div>
        </DialogHeader>

        {order && (
          <div className="bg-gray-50 rounded-lg p-3 mb-1 text-sm">
            <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
            <p className="text-gray-600">{order.customer_name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{order.delivery_address}</p>
          </div>
        )}

        <Input
          type="number"
          placeholder="Enter 4-digit OTP"
          value={otp}
          onChange={(e) => { setOtp(e.target.value); setError(""); }}
          className="text-center text-2xl font-bold tracking-widest h-14"
          maxLength={4}
        />

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-1">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isLoading}>Cancel</Button>
          <Button
            onClick={handleVerify}
            disabled={!otp.trim() || isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Deliver"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}