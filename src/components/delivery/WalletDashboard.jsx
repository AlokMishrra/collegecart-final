import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Package, ArrowUpCircle, AlertTriangle, Loader2, PlusCircle, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function WalletDashboard({ deliveryPerson, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showAddMoneyDialog, setShowAddMoneyDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");
  const [addMoneyAmount, setAddMoneyAmount] = useState("");
  const [addMoneyUpiId, setAddMoneyUpiId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [addMoneyStep, setAddMoneyStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [storeUpiId, setStoreUpiId] = useState("");
  const [withdrawSource, setWithdrawSource] = useState("wallet");

  useEffect(() => { loadData(); }, [deliveryPerson.id]);

  const loadData = async () => {
    const [txns, withdrawals, settings] = await Promise.all([
      base44.entities.WalletTransaction.filter({ delivery_person_id: deliveryPerson.id }, '-created_date', 50).catch(() => []),
      base44.entities.WithdrawalRequest.filter({ delivery_person_id: deliveryPerson.id, status: "pending" }).catch(() => []),
      base44.entities.Settings.list().catch(() => [])
    ]);
    setTransactions(txns);
    setPendingWithdrawals(withdrawals);
    if (settings.length > 0) setStoreUpiId(settings[0].store_upi_id || "");
    const today = new Date().toDateString();
    const earn = txns
      .filter(t => new Date(t.created_date).toDateString() === today && t.type === "delivery_earning")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    setTodayEarnings(earn);
  };

  // Group commission transactions by day
  const dailyEarningsList = Object.values(
    transactions
      .filter(t => t.type === "delivery_earning")
      .reduce((acc, t) => {
        const key = new Date(t.created_date).toDateString();
        if (!acc[key]) acc[key] = { date: new Date(t.created_date), amount: 0, count: 0 };
        acc[key].amount += t.amount || 0;
        acc[key].count++;
        return acc;
      }, {})
  ).sort((a, b) => b.date - a.date);

  const handleRequestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    const maxAmount = withdrawSource === "earnings" ? (deliveryPerson.total_earnings || 0) : walletBalance;
    if (!amount || amount <= 0 || amount > maxAmount) return;
    setIsLoading(true);
    await base44.entities.WithdrawalRequest.create({
      delivery_person_id: deliveryPerson.id,
      delivery_person_name: deliveryPerson.name,
      amount,
      upi_id: withdrawUpiId,
      type: "withdrawal",
      status: "pending",
      notes: withdrawSource === "earnings" ? "Withdrawal from total earnings" : "Withdrawal from wallet balance"
    });
    setShowWithdrawDialog(false);
    setWithdrawAmount("");
    setWithdrawUpiId("");
    setWithdrawSource("wallet");
    loadData();
    setIsLoading(false);
  };

  const handleAddMoneySubmit = async () => {
    const amount = parseFloat(addMoneyAmount);
    if (!amount || amount <= 0 || !addMoneyUpiId || !transactionId) return;
    setIsLoading(true);
    await base44.entities.WithdrawalRequest.create({
      delivery_person_id: deliveryPerson.id,
      delivery_person_name: deliveryPerson.name,
      amount,
      upi_id: addMoneyUpiId,
      transaction_id: transactionId,
      type: "deposit",
      status: "pending",
      notes: `Wallet top-up. Paid to store UPI: ${storeUpiId}`
    });
    setShowAddMoneyDialog(false);
    setAddMoneyAmount("");
    setAddMoneyUpiId("");
    setTransactionId("");
    setAddMoneyStep(1);
    loadData();
    setIsLoading(false);
  };

  const getUPILink = () => {
    if (!storeUpiId || !addMoneyAmount || parseFloat(addMoneyAmount) <= 0) return "";
    return `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=CollegeCart&am=${parseFloat(addMoneyAmount)}&cu=INR&tn=WalletDeposit`;
  };

  const getQRUrl = () => {
    const link = getUPILink();
    if (!link) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
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
      {/* Balance Card */}
      <Card className={`border-2 ${isNegative ? "border-red-300 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className={`w-5 h-5 ${isNegative ? "text-red-600" : "text-emerald-600"}`} />
            <h3 className="font-bold text-gray-900">My Wallet</h3>
            {isNegative && <Badge className="bg-red-100 text-red-700 ml-auto">Submit Cash Required</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
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
          </div>

          {pendingWithdrawals.length > 0 && (
            <p className="text-xs text-orange-600 mb-3 font-medium">{pendingWithdrawals.length} pending request(s) awaiting admin approval</p>
          )}

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
              <Button size="sm" variant="outline" onClick={() => { setWithdrawSource("wallet"); setShowWithdrawDialog(true); }} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                <ArrowUpCircle className="w-4 h-4 mr-1" />Withdraw Wallet
              </Button>
            )}
            {(deliveryPerson.total_earnings || 0) > 0 && (
              <Button size="sm" variant="outline" onClick={() => { setWithdrawSource("earnings"); setWithdrawAmount(""); setShowWithdrawDialog(true); }} className="border-purple-500 text-purple-600 hover:bg-purple-50">
                <ArrowUpCircle className="w-4 h-4 mr-1" />Withdraw Earnings
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setShowAddMoneyDialog(true); setAddMoneyStep(1); }} className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <PlusCircle className="w-4 h-4 mr-1" />Add Money
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions / Daily Earnings Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="daily"><Calendar className="w-3.5 h-3.5 mr-1" />Daily Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {transactions.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y max-h-72 overflow-y-auto">
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
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">No transactions yet</p>
          )}
        </TabsContent>

        <TabsContent value="daily">
          {dailyEarningsList.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-700">Commission Earned Per Day</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-72 overflow-y-auto">
                  {dailyEarningsList.map((day, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {day.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400">{day.count} delivery{day.count > 1 ? "s" : ""}</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">₹{day.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">No earnings recorded yet</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{withdrawSource === "earnings" ? "Withdraw from Total Earnings" : "Withdraw from Wallet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Available</p>
              <p className={`text-xl font-bold ${withdrawSource === "earnings" ? "text-purple-600" : "text-emerald-600"}`}>
                ₹{withdrawSource === "earnings" ? (deliveryPerson.total_earnings || 0).toFixed(2) : walletBalance.toFixed(2)}
              </p>
            </div>
            <div>
              <Label>Amount to Withdraw</Label>
              <Input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
            </div>
            <div>
              <Label>Your UPI ID</Label>
              <Input placeholder="yourname@upi" value={withdrawUpiId} onChange={(e) => setWithdrawUpiId(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleRequestWithdrawal}
                disabled={isLoading || !withdrawAmount || !withdrawUpiId || parseFloat(withdrawAmount) > (withdrawSource === "earnings" ? (deliveryPerson.total_earnings || 0) : walletBalance) || parseFloat(withdrawAmount) <= 0}
                className={`flex-1 ${withdrawSource === "earnings" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Money Dialog */}
      <Dialog open={showAddMoneyDialog} onOpenChange={(o) => { if (!o) { setAddMoneyStep(1); setAddMoneyAmount(""); setAddMoneyUpiId(""); setTransactionId(""); } setShowAddMoneyDialog(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />Add Money to Wallet
            </DialogTitle>
          </DialogHeader>

          {addMoneyStep === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Enter the amount you want to add to your wallet. You'll then pay via UPI and submit proof.</p>
              <div>
                <Label>Amount (₹)</Label>
                <Input type="number" placeholder="Enter amount" value={addMoneyAmount} onChange={(e) => setAddMoneyAmount(e.target.value)} min={1} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAddMoneyDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => setAddMoneyStep(2)} disabled={!addMoneyAmount || parseFloat(addMoneyAmount) <= 0} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Next: Pay →
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="text-center bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Pay to CollegeCart</p>
                <p className="text-2xl font-bold text-blue-600 mb-3">₹{addMoneyAmount}</p>

                {storeUpiId ? (
                  <>
                    <div className="flex justify-center mb-3">
                      <img src={getQRUrl()} alt="UPI QR Code" className="w-44 h-44 border-2 border-blue-200 rounded-xl bg-white p-1" />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Scan QR with any UPI app</p>
                    <a href={getUPILink()}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full mb-1">
                        Open UPI App & Pay ₹{addMoneyAmount}
                      </Button>
                    </a>
                    <p className="text-xs text-gray-400">UPI: {storeUpiId}</p>
                  </>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    Store UPI not configured. Contact admin for payment details, then submit your transaction ID below.
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold text-gray-700">After paying, fill in:</p>
                <div>
                  <Label className="text-xs">Your UPI ID (from which you paid)</Label>
                  <Input placeholder="yourname@upi" value={addMoneyUpiId} onChange={(e) => setAddMoneyUpiId(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">UPI Transaction ID</Label>
                    <button
                      type="button"
                      className="text-[10px] text-blue-600 underline"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text && text.trim()) setTransactionId(text.trim());
                        } catch {}
                      }}
                    >
                      Paste from clipboard
                    </button>
                  </div>
                  <Input placeholder="e.g. T2506121234567" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setAddMoneyStep(1)} className="flex-1">← Back</Button>
                <Button onClick={handleAddMoneySubmit} disabled={isLoading || !addMoneyUpiId || !transactionId} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for Approval"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}