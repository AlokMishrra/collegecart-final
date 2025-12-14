import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import html2canvas from "html2canvas";

export default function CustomQRGenerator() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showQR, setShowQR] = useState(false);

  const handleGenerate = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setShowQR(true);
  };

  const handleDownload = async () => {
    const qrElement = document.getElementById("qr-code-container");
    if (!qrElement) return;

    try {
      const canvas = await html2canvas(qrElement, {
        backgroundColor: "#ffffff",
        scale: 2
      });
      
      const link = document.createElement("a");
      link.download = `QR-${amount}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=upi://pay?pa=7248316506@okbizaxis%26pn=CollegeCart%26am=${parseFloat(amount).toFixed(2)}%26cu=INR%26tn=${encodeURIComponent(description || `Payment ${amount}`)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Custom QR Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Order payment, Deposit, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Generate QR Code
          </Button>

          {showQR && amount && (
            <div className="space-y-4">
              <div
                id="qr-code-container"
                className="bg-white border-2 border-gray-200 rounded-lg p-6"
              >
                <div className="text-center space-y-4">
                  <div className="bg-emerald-50 rounded-lg p-3 inline-block">
                    <p className="text-sm text-gray-600">Payment Amount</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      ₹{parseFloat(amount).toFixed(2)}
                    </p>
                  </div>

                  {description && (
                    <p className="text-sm text-gray-600 font-medium">
                      {description}
                    </p>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg inline-block">
                    <img
                      src={qrUrl}
                      alt="Payment QR Code"
                      className="w-64 h-64 mx-auto"
                    />
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold">Scan to pay via UPI</p>
                    <p>Payee: CollegeCart</p>
                    <p>UPI ID: 7248316506@okbizaxis</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  onClick={() => {
                    setAmount("");
                    setDescription("");
                    setShowQR(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 How to Use</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enter any amount to generate a UPI payment QR code</li>
            <li>• Add a description for better reference (optional)</li>
            <li>• Customer can scan with any UPI app to make payment</li>
            <li>• Download the QR code image for printing or sharing</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}