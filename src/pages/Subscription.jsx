import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Crown, Truck, Loader2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PLANS = [
  {
    type: "student",
    name: "Student Plan",
    price: 99,
    icon: "🎓",
    colorClass: "border-emerald-300 hover:border-emerald-500",
    btnClass: "bg-emerald-600 hover:bg-emerald-700",
    textClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    checkClass: "text-emerald-500",
    perks: ["Free delivery on all orders", "Valid for 1 month", "Priority customer support"]
  },
  {
    type: "faculty",
    name: "Faculty Plan",
    price: 199,
    icon: "👨‍🏫",
    colorClass: "border-purple-300 hover:border-purple-500",
    btnClass: "bg-purple-600 hover:bg-purple-700",
    textClass: "text-purple-600",
    bgClass: "bg-purple-50",
    checkClass: "text-purple-500",
    perks: ["Free delivery on all orders", "Valid for 1 month", "Priority customer support", "Exclusive faculty benefits"]
  }
];

export default function Subscription() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payStep, setPayStep] = useState(1);
  const [upiId, setUpiId] = useState("");
  const [txnId, setTxnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setIsLoading(true);
    try {
      const u = await User.me();
      setUser(u);
      const [subs, settingsList] = await Promise.all([
        base44.entities.Subscription.filter({ user_id: u.id }, '-created_date', 10).catch(() => []),
        base44.entities.Settings.list().catch(() => [])
      ]);
      const now = new Date();
      const active = subs.find(s => s.status === 'active' && (!s.end_date || new Date(s.end_date) > now));
      const pending = subs.find(s => s.status === 'pending_verification');
      setCurrentSub(active || pending || null);
      if (settingsList.length > 0) setSettings(settingsList[0]);
    } catch {
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  };

  const openPayDialog = (plan) => {
    setSelectedPlan(plan);
    setPayStep(1);
    setUpiId("");
    setTxnId("");
    setShowPayDialog(true);
  };

  const getQRUrl = () => {
    if (!settings?.store_upi_id || !selectedPlan) return "";
    const link = `upi://pay?pa=${encodeURIComponent(settings.store_upi_id)}&pn=CollegeCart&am=${selectedPlan.price}&cu=INR&tn=Subscription`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  };

  const getUPILink = () => {
    if (!settings?.store_upi_id || !selectedPlan) return "";
    return `upi://pay?pa=${encodeURIComponent(settings.store_upi_id)}&pn=CollegeCart&am=${selectedPlan.price}&cu=INR&tn=Subscription`;
  };

  const submitSubscription = async () => {
    if (!upiId.trim() || !txnId.trim() || !selectedPlan) return;
    setIsSubmitting(true);
    await base44.entities.Subscription.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      plan_type: selectedPlan.type,
      amount_paid: selectedPlan.price,
      upi_id: upiId.trim(),
      transaction_id: txnId.trim(),
      status: 'pending_verification'
    });
    await base44.entities.Notification.create({
      user_id: user.id,
      title: "Subscription Request Submitted!",
      message: "Your request is under review. We'll activate it within 24 hours!",
      type: "info"
    });
    setShowPayDialog(false);
    await init();
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  const isActive = currentSub?.status === 'active';
  const isPending = currentSub?.status === 'pending_verification';
  const activePlanInfo = PLANS.find(p => p.type === currentSub?.plan_type);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">CollegeCart Premium</h1>
        <p className="text-gray-500 mt-1">Subscribe and enjoy free delivery on every order</p>
      </div>

      {/* Active Subscription */}
      {isActive && (
        <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-800">You're Premium! 🎉</h2>
            <p className="text-emerald-600 font-medium mt-1">{activePlanInfo?.name}</p>
            {currentSub?.end_date && (
              <p className="text-sm text-gray-500 mt-2">
                Valid until: <strong>{new Date(currentSub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </p>
            )}
            <div className="mt-4 bg-white rounded-xl p-3 flex items-center justify-center gap-2 border border-emerald-200">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-700">Free delivery on all your orders!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Verification */}
      {isPending && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-yellow-800">Under Verification</h2>
            <p className="text-yellow-700 mt-1">Your subscription request is being reviewed by admin.</p>
            <p className="text-sm text-gray-500 mt-2">Expected activation: Within 24 hours</p>
            <Badge className="mt-3 bg-yellow-100 text-yellow-800 border border-yellow-300">
              {activePlanInfo?.name} — ₹{currentSub?.amount_paid}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection */}
      {!isActive && !isPending && (
        <>
          <h2 className="text-xl font-semibold text-gray-700 text-center">Choose Your Plan</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PLANS.map(plan => (
              <Card key={plan.type} className={`border-2 ${plan.colorClass} transition-all hover:shadow-lg cursor-pointer`}>
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="text-center mb-4">
                    <span className="text-5xl">{plan.icon}</span>
                    <h3 className="text-xl font-bold mt-3 text-gray-900">{plan.name}</h3>
                    <div className={`text-4xl font-bold mt-1 ${plan.textClass}`}>
                      ₹{plan.price}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-5 flex-1">
                    {plan.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.checkClass}`} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => openPayDialog(plan)} className={`w-full ${plan.btnClass}`}>
                    <Crown className="w-4 h-4 mr-1.5" />Subscribe Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* How it works */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />How it works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { step: "1", text: "Choose a plan" },
                  { step: "2", text: "Pay via UPI" },
                  { step: "3", text: "Submit proof" },
                  { step: "4", text: "Admin activates within 24hrs" }
                ].map(({ step, text }) => (
                  <div key={step} className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                      {step}
                    </div>
                    <p className="text-xs text-gray-600">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={(o) => { if (!o) setPayStep(1); setShowPayDialog(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedPlan?.icon}</span>
              Subscribe — {selectedPlan?.name}
            </DialogTitle>
          </DialogHeader>

          {payStep === 1 ? (
            <div className="space-y-4">
              <div className="text-center bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-500 mb-1">Pay to CollegeCart</p>
                <p className={`text-3xl font-bold ${selectedPlan?.textClass}`}>₹{selectedPlan?.price}</p>
                {settings?.store_upi_id ? (
                  <>
                    <div className="flex justify-center my-3">
                      <img src={getQRUrl()} alt="UPI QR" className="w-44 h-44 border-2 border-emerald-200 rounded-xl bg-white p-1" />
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Scan with any UPI app</p>
                    <a href={getUPILink()}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full mb-1">
                        Open UPI App & Pay ₹{selectedPlan?.price}
                      </Button>
                    </a>
                    <p className="text-xs text-gray-400">UPI: {settings.store_upi_id}</p>
                  </>
                ) : (
                  <p className="text-sm text-yellow-700 mt-3 bg-yellow-50 rounded-lg p-2">Contact admin for payment UPI details.</p>
                )}
              </div>
              <Button onClick={() => setPayStep(2)} className={`w-full ${selectedPlan?.btnClass}`}>
                I've Paid — Submit Proof →
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter your payment proof for verification:</p>
              <div>
                <Label>Your UPI ID (you paid from)</Label>
                <Input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>UPI Transaction ID</Label>
                  <button
                    type="button"
                    className="text-[10px] text-blue-600 underline"
                    onClick={async () => {
                      try { const t = await navigator.clipboard.readText(); if (t) setTxnId(t.trim()); } catch {}
                    }}
                  >Paste from clipboard</button>
                </div>
                <Input placeholder="e.g. T2506121234567" value={txnId} onChange={e => setTxnId(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPayStep(1)} className="flex-1">← Back</Button>
                <Button
                  onClick={submitSubscription}
                  disabled={isSubmitting || !upiId.trim() || !txnId.trim()}
                  className={`flex-1 ${selectedPlan?.btnClass}`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for Approval"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}