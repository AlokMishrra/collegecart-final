import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Plus, Edit, Trash2, User as UserIcon, Ban, CheckCircle, Wallet, RefreshCw, Clock, ArrowUpCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryPersonForm from "./DeliveryPersonForm";
import ShiftManagement from "./ShiftManagement";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function DeliveryPersonManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, person: null });
  const [blockDialog, setBlockDialog] = useState({ open: false, person: null });
  const [walletDialog, setWalletDialog] = useState({ open: false, person: null });
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadDeliveryPersons();
    loadWithdrawalRequests();
    User.me().then(setUser).catch(() => {});
  }, []);

  const loadDeliveryPersons = async () => {
    setIsLoading(true);
    const data = await DeliveryPerson.list('-created_date').catch(() => []);
    setDeliveryPersons(data);
    setIsLoading(false);
  };

  const loadWithdrawalRequests = async () => {
    const data = await base44.entities.WithdrawalRequest.filter({ status: "pending" }, '-created_date').catch(() => []);
    setWithdrawalRequests(data);
  };

  const openWalletDialog = async (person) => {
    setWalletDialog({ open: true, person });
    setAdjustAmount("");
    setAdjustNote("");
    const txns = await base44.entities.WalletTransaction.filter({ delivery_person_id: person.id }, '-created_date', 15).catch(() => []);
    setWalletTransactions(txns);
  };

  const handleResetWallet = async () => {
    const person = walletDialog.person;
    if (!person) return;
    setIsAdjusting(true);
    const prevBalance = person.wallet_balance || 0;
    await Promise.all([
      base44.entities.DeliveryPerson.update(person.id, { wallet_balance: 0 }),
      base44.entities.WalletTransaction.create({
        delivery_person_id: person.id,
        amount: -prevBalance,
        type: "cash_submitted",
        description: `Admin reset wallet (COD cash settled). Previous balance: ₹${prevBalance.toFixed(2)}`,
        balance_after: 0
      })
    ]);
    const updated = { ...person, wallet_balance: 0 };
    setWalletDialog({ open: true, person: updated });
    setDeliveryPersons(prev => prev.map(p => p.id === person.id ? updated : p));
    const txns = await base44.entities.WalletTransaction.filter({ delivery_person_id: person.id }, '-created_date', 15).catch(() => []);
    setWalletTransactions(txns);
    setIsAdjusting(false);
  };

  const handleManualAdjust = async (isCredit) => {
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0) return;
    const person = walletDialog.person;
    setIsAdjusting(true);
    const delta = isCredit ? amount : -amount;
    const newBalance = (person.wallet_balance || 0) + delta;
    await Promise.all([
      base44.entities.DeliveryPerson.update(person.id, { wallet_balance: newBalance }),
      base44.entities.WalletTransaction.create({
        delivery_person_id: person.id,
        amount: delta,
        type: isCredit ? "deposit" : "withdrawal",
        description: adjustNote || (isCredit ? `Admin credit: ₹${amount}` : `Admin debit: ₹${amount}`),
        balance_after: newBalance
      })
    ]);
    const updated = { ...person, wallet_balance: newBalance };
    setWalletDialog({ open: true, person: updated });
    setDeliveryPersons(prev => prev.map(p => p.id === person.id ? updated : p));
    setAdjustAmount("");
    setAdjustNote("");
    const txns = await base44.entities.WalletTransaction.filter({ delivery_person_id: person.id }, '-created_date', 15).catch(() => []);
    setWalletTransactions(txns);
    setIsAdjusting(false);
  };

  const handleApproveWithdrawal = async (req) => {
    await Promise.all([
      base44.entities.WithdrawalRequest.update(req.id, { status: "approved", admin_notes: "Approved by admin" }),
      base44.entities.DeliveryPerson.update(req.delivery_person_id, {
        wallet_balance: ((deliveryPersons.find(p => p.id === req.delivery_person_id)?.wallet_balance) || 0) - req.amount
      }),
      base44.entities.WalletTransaction.create({
        delivery_person_id: req.delivery_person_id,
        amount: -req.amount,
        type: "withdrawal",
        description: `Withdrawal approved: ₹${req.amount} to ${req.upi_id}`,
        balance_after: ((deliveryPersons.find(p => p.id === req.delivery_person_id)?.wallet_balance) || 0) - req.amount
      })
    ]);
    loadWithdrawalRequests();
    loadDeliveryPersons();
  };

  const handleRejectWithdrawal = async (req) => {
    await base44.entities.WithdrawalRequest.update(req.id, { status: "rejected", admin_notes: "Rejected by admin" });
    loadWithdrawalRequests();
  };

  const handleSavePerson = async (personData) => {
    if (selectedPerson) {
      await DeliveryPerson.update(selectedPerson.id, personData);
    } else {
      await DeliveryPerson.create(personData);
    }
    loadDeliveryPersons();
    setIsFormOpen(false);
    setSelectedPerson(null);
  };

  const handleDeletePerson = async () => {
    if (!deleteDialog.person) return;
    await DeliveryPerson.delete(deleteDialog.person.id);
    loadDeliveryPersons();
    setDeleteDialog({ open: false, person: null });
  };

  const toggleBlockStatus = async () => {
    if (!blockDialog.person) return;
    await DeliveryPerson.update(blockDialog.person.id, { is_blocked: !blockDialog.person.is_blocked });
    loadDeliveryPersons();
    setBlockDialog({ open: false, person: null });
  };

  const txTypeLabel = {
    delivery_earning: "Commission", cod_collection: "COD Collected",
    cash_submitted: "Cash Submitted", withdrawal: "Withdrawal",
    deposit: "Deposit", incentive: "Incentive"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Partners</h2>
          <p className="text-gray-600">Manage your delivery team</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedPerson(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Delivery Person
        </Button>
      </div>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="shifts"><Clock className="w-3.5 h-3.5 mr-1" />Shifts</TabsTrigger>
          <TabsTrigger value="withdrawals">
            Withdrawals
            {withdrawalRequests.length > 0 && <Badge className="ml-1.5 bg-orange-500 text-white text-xs">{withdrawalRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryPersons.map(person => {
                    const balance = person.wallet_balance || 0;
                    const isNeg = balance < 0;
                    return (
                      <TableRow key={person.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <UserIcon className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium">{person.name}</p>
                              <p className="text-xs text-gray-500">{person.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{person.phone_number}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={person.is_available ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {person.is_available ? "Online" : "Offline"}
                            </Badge>
                            {person.is_blocked && <Badge className="bg-red-100 text-red-700">Blocked</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {person.current_shift
                            ? <Badge className="bg-blue-100 text-blue-700 capitalize">{person.current_shift}</Badge>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold text-sm ${isNeg ? "text-red-600" : "text-emerald-600"}`}>
                            {isNeg ? "-" : ""}₹{Math.abs(balance).toFixed(0)}
                          </span>
                          {isNeg && <p className="text-xs text-red-500">COD owed</p>}
                        </TableCell>
                        <TableCell>{person.total_deliveries || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon" title="Manage Wallet" onClick={() => openWalletDialog(person)} className="text-emerald-600 hover:text-emerald-700">
                              <Wallet className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => { setSelectedPerson(person); setIsFormOpen(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setBlockDialog({ open: true, person })}
                              className={person.is_blocked ? "text-green-600" : "text-red-600"} title={person.is_blocked ? "Unblock" : "Block"}>
                              {person.is_blocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setDeleteDialog({ open: true, person })} className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && deliveryPersons.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No delivery partners yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal Requests Tab */}
        <TabsContent value="withdrawals">
          <Card>
            <CardContent className="p-0">
              {withdrawalRequests.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No pending withdrawal requests</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.delivery_person_name}</TableCell>
                        <TableCell className="font-bold text-emerald-600">₹{req.amount?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{req.upi_id || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{new Date(req.created_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveWithdrawal(req)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawal(req)}>
                              <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPerson ? "Edit Delivery Person" : "Add New Delivery Person"}</DialogTitle>
          </DialogHeader>
          <DeliveryPersonForm person={selectedPerson} onSave={handleSavePerson} onCancel={() => { setIsFormOpen(false); setSelectedPerson(null); }} />
        </DialogContent>
      </Dialog>

      {/* Wallet Management Dialog */}
      <Dialog open={walletDialog.open} onOpenChange={(o) => setWalletDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" />Wallet — {walletDialog.person?.name}</DialogTitle>
          </DialogHeader>
          {walletDialog.person && (() => {
            const balance = walletDialog.person.wallet_balance || 0;
            const isNeg = balance < 0;
            return (
              <div className="space-y-4">
                {/* Balance Display */}
                <div className={`rounded-xl p-4 text-center ${isNeg ? "bg-red-50 border-2 border-red-200" : "bg-emerald-50 border-2 border-emerald-200"}`}>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className={`text-3xl font-bold mt-1 ${isNeg ? "text-red-600" : "text-emerald-600"}`}>
                    {isNeg ? "-" : ""}₹{Math.abs(balance).toFixed(2)}
                  </p>
                  {isNeg && <p className="text-xs text-red-500 mt-1">Partner owes this COD cash to store</p>}
                </div>

                {/* Reset Wallet (for COD settlements) */}
                {isNeg && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Reset Wallet (COD Settled)</p>
                      <p className="text-xs text-orange-600">Partner submitted ₹{Math.abs(balance).toFixed(2)} cash</p>
                    </div>
                    <Button size="sm" onClick={handleResetWallet} disabled={isAdjusting} className="bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0">
                      {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-3.5 h-3.5 mr-1" />Reset to ₹0</>}
                    </Button>
                  </div>
                )}

                {/* Manual Adjustment */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Manual Wallet Adjustment</Label>
                  <Input type="number" placeholder="Amount (₹)" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
                  <Input placeholder="Note (optional)" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleManualAdjust(true)} disabled={isAdjusting || !adjustAmount}>
                      <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />Add Credit
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleManualAdjust(false)} disabled={isAdjusting || !adjustAmount}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />Deduct
                    </Button>
                  </div>
                </div>

                {/* Recent Transactions */}
                {walletTransactions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Recent Transactions</p>
                    <div className="divide-y border rounded-lg max-h-44 overflow-y-auto">
                      {walletTransactions.map((txn, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs text-gray-700 truncate">{txn.description}</p>
                            <p className="text-[10px] text-gray-400">{new Date(txn.created_date).toLocaleDateString('en-IN')}</p>
                          </div>
                          <span className={`text-sm font-bold flex-shrink-0 ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {txn.amount >= 0 ? "+" : ""}₹{Math.abs(txn.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Remove Delivery Person"
        description={`Are you sure you want to remove "${deleteDialog.person?.name}"?`}
        onConfirm={handleDeletePerson}
        onCancel={() => setDeleteDialog({ open: false, person: null })}
        confirmText="Remove" cancelText="Cancel"
      />
      <ConfirmDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}
        title={blockDialog.person?.is_blocked ? "Unblock Partner" : "Block Partner"}
        description={blockDialog.person?.is_blocked
          ? `Unblock "${blockDialog.person?.name}"? They can accept orders again.`
          : `Block "${blockDialog.person?.name}"? They won't be able to accept orders.`}
        onConfirm={toggleBlockStatus}
        onCancel={() => setBlockDialog({ open: false, person: null })}
        confirmText={blockDialog.person?.is_blocked ? "Unblock" : "Block"} cancelText="Cancel"
      />
    </div>
  );
}