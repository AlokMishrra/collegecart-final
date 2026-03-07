import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Wallet, Package, ArrowUpCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function WalletDashboard({ deliveryPerson, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => { loadData(); }, [deliveryPerson.id]);

  const loadData = async () => {
    const [txns, withdrawals] = await Promise.all([
      base44.entities.WalletTransaction.filter({ delivery_person_id: deliveryPerson.id }, '-created_date', 20).catch(() => []),
      base44.entities.WithdrawalRequest.filter({ delivery_person_id: deliveryPerson.id, status: "pending" }).catch(() => [])
    ]);
    setTransactions(txns);
    setPendingWithdrawals(withdrawals);
    const today = new Date().toDateString();
    const earn = txns
      .filter(t => new Date(t.created_date).toDateString() === today && t.type === "delivery_earning")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    setTodayEarnings(earn);
  };

  const [withdrawSource, setWithdrawSource] = useState("wallet"); // "wallet" or "earnings"

  const handleRequestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    const maxAmount = withdrawSource === "earnings" ? (deliveryPerson.total_earnings || 0) : walletBalance;
    if (!amount || amount <= 0 || amount > maxAmount) return;
    setIsLoading(true);
    await base44.entities.WithdrawalRequest.create({
      delivery_person_id: deliveryPerson.id,
      delivery_person_name: deliveryPerson.name,
      amount,
      upi_id: upiId,
      status: "pending",
      notes: withdrawSource === "earnings" ? "Withdrawal from total earnings" : "Withdrawal from wallet balance"
    });
    setShowWithdrawDialog(false);
    setWithdrawAmount("");
    setUpiId("");
    setWithdrawSource("wallet");
    loadData();
    setIsLoading(false);
  };



  const walletBalance = deliveryPerson.wallet_balance || 0;
  const isNegative = walletBalance < 0;
  const cashOwed = isNegative ? Math.abs(walletBalance) : 0;

  const txTypeLabel = {
    delivery_earning: "Commission",
    cod_collection: "COD Collected",
    cash_submitted: "Cash Submitted",
    withdrawal: "Withdrawal",
    deposit: "Deposit",
    incentive: "Incentive"
  };

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className={`border-2 ${isNegative ? "border-red-300 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className={`w-5 h-5 ${isNegative ? "text-red-600" : "text-emerald-600"}`} />
            <h3 className="font-bold text-gray-900">My Wallet</h3>
            {isNegative && <Badge className="bg-red-100 text-red-700 ml-auto">Submit Cash Required</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
              <p className={`text-2xl font-bold ${isNegative ? "text-red-600" : "text-emerald-600"}`}>
                {isNegative ? "-" : ""}₹{Math.abs(walletBalance).toFixed(2)}
              </p>
              {isNegative && <p className="text-xs text-red-500">COD cash owed</p>}
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Today's Earnings</p>
              <p className="text-2xl font-bold text-blue-600">₹{todayEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Total Earnings</p>
              <p className="text-xl font-bold text-purple-600">₹{(deliveryPerson.total_earnings || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Total Deliveries</p>
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4 text-gray-400" />
                <p className="text-xl font-bold text-gray-800">{deliveryPerson.total_deliveries || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Pending Withdrawals</p>
              <p className="text-xl font-bold text-orange-600">{pendingWithdrawals.length}</p>
            </div>
          </div>

          {isNegative && (
            <div className="bg-red-100 rounded-lg p-3 flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                You collected ₹{cashOwed.toFixed(2)} COD cash. Submit it physically to admin — they will reset your wallet.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {walletBalance > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setWithdrawSource("wallet"); setShowWithdrawDialog(true); }}
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                <ArrowUpCircle className="w-4 h-4 mr-1" />
                Withdraw Wallet
              </Button>
            )}
            {(deliveryPerson.total_earnings || 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setWithdrawSource("earnings"); setWithdrawAmount(""); setShowWithdrawDialog(true); }}
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <ArrowUpCircle className="w-4 h-4 mr-1" />
                Withdraw Earnings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-48 overflow-y-auto">
              {transactions.map((txn, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-medium text-gray-800 truncate">{txn.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{txTypeLabel[txn.type] || txn.type}</Badge>
                      <p className="text-[10px] text-gray-400">{new Date(txn.created_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {txn.amount >= 0 ? "+" : ""}₹{Math.abs(txn.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (Available: ₹{walletBalance.toFixed(2)})</Label>
              <Input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} max={walletBalance} />
            </div>
            <div>
              <Label>UPI ID</Label>
              <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleRequestWithdrawal}
                disabled={isLoading || !withdrawAmount || parseFloat(withdrawAmount) > walletBalance || !upiId}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}