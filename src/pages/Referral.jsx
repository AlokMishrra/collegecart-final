import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Share2, Check, Users } from "lucide-react";

export default function Referral() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [myCode, setMyCode] = useState("");
  const [referCode, setReferCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const u = await User.me();
      setUser(u);
      // Generate code from user id
      const code = "CC" + u.id.slice(-6).toUpperCase();
      setMyCode(code);
      // Load referrals where this user is the referrer
      const refs = await base44.entities.Referral.filter({ referrer_id: u.id }, '-created_date', 50).catch(() => []);
      setReferrals(refs);
    } catch (e) {}
    setIsLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    const text = `Join CollegeCart and get ₹20 off your first order! Use my referral code: ${myCode}\n\nOrder food & essentials delivered to your hostel!`;
    if (navigator.share) {
      navigator.share({ title: "CollegeCart Referral", text });
    } else {
      navigator.clipboard.writeText(text);
      setMessage("Share text copied to clipboard!");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const applyReferralCode = async () => {
    if (!referCode.trim() || !user) return;
    const code = referCode.trim().toUpperCase();
    if (code === myCode) {
      setMessage("You can't use your own referral code!");
      return;
    }
    // Check if already used referral
    const existing = await base44.entities.Referral.filter({ referred_user_id: user.id }).catch(() => []);
    if (existing.length > 0) {
      setMessage("You've already used a referral code.");
      return;
    }
    // Find referral by code
    const refs = await base44.entities.Referral.filter({ referral_code: code }).catch(() => []);
    if (refs.length > 0) {
      // Update existing referral record with this user
      await base44.entities.Referral.update(refs[0].id, { referred_user_id: user.id, referred_email: user.email });
      setMessage("✅ Referral code applied! You'll get ₹20 off after your first order.");
    } else {
      // Create new referral record (we'll find the referrer's user by code pattern)
      await base44.entities.Referral.create({
        referrer_id: "pending",
        referral_code: code,
        referred_user_id: user.id,
        referred_email: user.email,
        status: "pending"
      });
      setMessage("✅ Referral code applied! You'll get ₹20 off after your first order.");
    }
    setReferCode("");
    setTimeout(() => setMessage(""), 4000);
  };

  const totalEarned = referrals.filter(r => r.status === "rewarded").length * 20;
  const pendingCount = referrals.filter(r => r.status === "pending").length;

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Gift className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Refer & Earn</h1>
        <p className="text-gray-600 mt-1">Invite friends and earn ₹20 each when they place their first order</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Earned", value: `₹${totalEarned}`, color: "text-emerald-600" },
          { label: "Successful", value: referrals.filter(r => r.status === "rewarded").length, color: "text-blue-600" },
          { label: "Pending", value: pendingCount, color: "text-yellow-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Referral Code */}
      <Card className="border-2 border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-emerald-600" />Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={myCode} readOnly className="font-mono text-lg font-bold text-center bg-white" />
            <Button variant="outline" onClick={copyCode} className="flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={shareCode}>
            <Share2 className="w-4 h-4 mr-2" />Share & Invite Friends
          </Button>
          <div className="bg-white rounded-lg p-3 space-y-1 text-sm">
            <p className="font-semibold text-gray-900">How it works:</p>
            <p className="text-gray-600">1. Share your code with a friend</p>
            <p className="text-gray-600">2. They sign up and use your code</p>
            <p className="text-gray-600">3. They place their first order</p>
            <p className="text-emerald-700 font-semibold">4. Both of you get ₹20! 🎉</p>
          </div>
        </CardContent>
      </Card>

      {/* Apply Referral Code */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Have a Referral Code?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter referral code"
              value={referCode}
              onChange={e => setReferCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button variant="outline" onClick={applyReferralCode} disabled={!referCode.trim()}>Apply</Button>
          </div>
          {message && <p className={`text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{message}</p>}
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Referral History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.referred_email || "Invited user"}</p>
                    <p className="text-xs text-gray-500">{new Date(r.created_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <Badge className={r.status === "rewarded" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {r.status === "rewarded" ? "✅ ₹20 Earned" : "⏳ Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}