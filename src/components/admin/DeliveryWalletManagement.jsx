import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, DollarSign, TrendingUp, TrendingDown, RefreshCw, History } from "lucide-react";

export default function DeliveryWalletManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [persons, settlementData] = await Promise.all([
        base44.entities.DeliveryPerson.list(),
        base44.entities.DeliverySettlement.list('-created_date')
      ]);
      setDeliveryPersons(persons);
      setSettlements(settlementData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSettleBalance = async () => {
    if (!selectedPerson || !settlementAmount || !currentUser) return;

    try {
      const amount = parseFloat(settlementAmount);
      const previousBalance = selectedPerson.account_balance || 0;
      const newBalance = previousBalance - amount; // Subtract because delivery partner is paying admin

      // Update delivery person balance
      await base44.entities.DeliveryPerson.update(selectedPerson.id, {
        account_balance: newBalance
      });

      // Create settlement record
      await base44.entities.DeliverySettlement.create({
        delivery_person_id: selectedPerson.id,
        delivery_person_name: selectedPerson.name,
        settlement_amount: amount,
        previous_balance: previousBalance,
        new_balance: newBalance,
        settlement_type: "daily_settlement",
        notes: settlementNotes || "COD settlement processed",
        settled_by: currentUser.email
      });

      // Notify delivery person
      await base44.entities.Notification.create({
        user_id: selectedPerson.email,
        title: "Settlement Processed",
        message: `₹${amount.toFixed(2)} settlement processed. New balance: ₹${newBalance.toFixed(2)}`,
        type: newBalance >= 0 ? "success" : "warning"
      });

      setShowSettlementDialog(false);
      setSelectedPerson(null);
      setSettlementAmount("");
      setSettlementNotes("");
      loadData();
    } catch (error) {
      console.error("Error processing settlement:", error);
    }
  };

  const handleAdjustBalance = async (person, adjustmentAmount, notes) => {
    try {
      const amount = parseFloat(adjustmentAmount);
      const previousBalance = person.account_balance || 0;
      const newBalance = previousBalance + amount;

      await base44.entities.DeliveryPerson.update(person.id, {
        account_balance: newBalance
      });

      await base44.entities.DeliverySettlement.create({
        delivery_person_id: person.id,
        delivery_person_name: person.name,
        settlement_amount: amount,
        previous_balance: previousBalance,
        new_balance: newBalance,
        settlement_type: "admin_adjustment",
        notes: notes || "Admin balance adjustment",
        settled_by: currentUser?.email || "admin"
      });

      await base44.entities.Notification.create({
        user_id: person.email,
        title: "Balance Adjusted",
        message: `Your wallet balance was adjusted by ₹${amount.toFixed(2)}. New balance: ₹${newBalance.toFixed(2)}`,
        type: "info"
      });

      loadData();
    } catch (error) {
      console.error("Error adjusting balance:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Delivery Partner Wallets</h2>
          <p className="text-gray-600">Manage COD collections and settlements</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Delivery Persons Wallet Status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deliveryPersons.map(person => (
          <Card key={person.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {person.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className={`text-2xl font-bold ${person.account_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(person.account_balance || 0).toFixed(2)}
                  </p>
                </div>
                {person.account_balance < 0 && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Account Blocked - Negative Balance
                  </Badge>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPerson(person);
                      setSettlementAmount(Math.abs(person.account_balance || 0).toString());
                      setShowSettlementDialog(true);
                    }}
                    disabled={person.account_balance <= 0}
                    className="flex-1"
                  >
                    Settle COD
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const adjustment = prompt("Enter adjustment amount (positive or negative):");
                      const notes = prompt("Adjustment reason:");
                      if (adjustment && notes) {
                        handleAdjustBalance(person, adjustment, notes);
                      }
                    }}
                    className="flex-1"
                  >
                    Adjust
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Settlement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Delivery Person</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Previous Balance</TableHead>
                <TableHead>New Balance</TableHead>
                <TableHead>Settled By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map(settlement => (
                <TableRow key={settlement.id}>
                  <TableCell>
                    {new Date(settlement.created_date).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{settlement.delivery_person_name}</TableCell>
                  <TableCell>
                    <Badge variant={settlement.settlement_type === 'cod_collection' ? 'default' : 'outline'}>
                      {settlement.settlement_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={settlement.settlement_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {settlement.settlement_amount >= 0 ? '+' : ''}₹{settlement.settlement_amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>₹{settlement.previous_balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={settlement.new_balance >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                      ₹{settlement.new_balance.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{settlement.settled_by || 'System'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{settlement.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process COD Settlement</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">{selectedPerson.name}</p>
                <p className="text-sm text-gray-600">Current Balance: <span className="font-bold text-emerald-600">₹{(selectedPerson.account_balance || 0).toFixed(2)}</span></p>
              </div>
              <div>
                <Label>Settlement Amount</Label>
                <Input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Settlement notes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowSettlementDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSettleBalance} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Process Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}