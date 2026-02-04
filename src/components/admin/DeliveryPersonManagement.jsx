import React, { useState, useEffect } from "react";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Plus, Edit, Trash2, User as UserIcon, Ban, CheckCircle, Wallet, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import DeliveryPersonForm from "./DeliveryPersonForm";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function DeliveryPersonManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, person: null });
  const [blockDialog, setBlockDialog] = useState({ open: false, person: null });
  const [balanceDialog, setBalanceDialog] = useState({ open: false, person: null });
  const [balanceAmount, setBalanceAmount] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadDeliveryPersons();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error getting user:", error);
    }
  };

  const loadDeliveryPersons = async () => {
    setIsLoading(true);
    try {
      const data = await DeliveryPerson.list('-created_date');
      setDeliveryPersons(data);
    } catch (error) {
      console.error("Error loading delivery persons:", error);
    }
    setIsLoading(false);
  };

  const showNotification = async (title, message, type) => {
    if (user) {
      try {
        await Notification.create({
          user_id: user.id,
          title,
          message,
          type
        });
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }
  };

  const handleSavePerson = async (personData) => {
    try {
      if (selectedPerson) {
        await DeliveryPerson.update(selectedPerson.id, personData);
        await showNotification(
          "Delivery Person Updated",
          `${personData.name}'s profile has been updated successfully`,
          "success"
        );
      } else {
        await DeliveryPerson.create(personData);
        await showNotification(
          "Delivery Person Added",
          `${personData.name} has been added to your delivery team`,
          "success"
        );
      }
      loadDeliveryPersons();
      setIsFormOpen(false);
      setSelectedPerson(null);
    } catch (error) {
      console.error("Error saving delivery person:", error);
      await showNotification(
        "Error",
        "Failed to save delivery person. Please try again.",
        "error"
      );
    }
  };

  const handleDeletePerson = async () => {
    if (!deleteDialog.person) return;
    
    try {
      await DeliveryPerson.delete(deleteDialog.person.id);
      await showNotification(
        "Delivery Person Removed",
        `${deleteDialog.person.name} has been removed from your team`,
        "success"
      );
      loadDeliveryPersons();
    } catch (error) {
      console.error("Error deleting delivery person:", error);
      await showNotification(
        "Delete Failed",
        "Failed to remove delivery person. Please try again.",
        "error"
      );
    }
    setDeleteDialog({ open: false, person: null });
  };

  const toggleAvailability = async (person) => {
    try {
      await DeliveryPerson.update(person.id, {
        is_available: !person.is_available
      });
      await showNotification(
        "Status Updated",
        `${person.name} is now ${!person.is_available ? 'available' : 'unavailable'}`,
        "info"
      );
      loadDeliveryPersons();
    } catch (error) {
      console.error("Error updating availability:", error);
      await showNotification(
        "Update Failed",
        "Failed to update availability status",
        "error"
      );
    }
  };

  const toggleBlockStatus = async () => {
    if (!blockDialog.person) return;

    try {
      await DeliveryPerson.update(blockDialog.person.id, {
        is_blocked: !blockDialog.person.is_blocked
      });
      await showNotification(
        `Delivery Person ${blockDialog.person.is_blocked ? 'Unblocked' : 'Blocked'}`,
        `${blockDialog.person.name} has been ${!blockDialog.person.is_blocked ? 'blocked' : 'unblocked'}. ${!blockDialog.person.is_blocked ? 'They can no longer accept or see orders.' : 'They can now accept orders again.'}`,
        "info"
      );
      loadDeliveryPersons();
    } catch (error) {
      console.error("Error updating block status:", error);
      await showNotification(
        "Update Failed",
        "Failed to update block status",
        "error"
      );
    }
    setBlockDialog({ open: false, person: null });
  };

  const updateAccountBalance = async () => {
    if (!balanceDialog.person || !balanceAmount) return;

    try {
      const amount = parseFloat(balanceAmount);
      const newBalance = (balanceDialog.person.account_balance || 0) + amount;
      
      await DeliveryPerson.update(balanceDialog.person.id, {
        account_balance: newBalance
      });
      
      await showNotification(
        "Balance Updated",
        `${balanceDialog.person.name}'s balance updated. New balance: ₹${newBalance.toFixed(2)}`,
        "success"
      );
      
      loadDeliveryPersons();
      setBalanceDialog({ open: false, person: null });
      setBalanceAmount("");
    } catch (error) {
      console.error("Error updating balance:", error);
      await showNotification(
        "Update Failed",
        "Failed to update account balance",
        "error"
      );
    }
  };

  const resetDailyCOD = async (person) => {
    try {
      await DeliveryPerson.update(person.id, {
        daily_cod_collected: 0
      });
      await showNotification(
        "Daily COD Reset",
        `${person.name}'s daily COD collection has been reset to ₹0`,
        "success"
      );
      loadDeliveryPersons();
    } catch (error) {
      console.error("Error resetting daily COD:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Partners</h2>
          <p className="text-gray-600">Manage your delivery team</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery Person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPerson ? "Edit Delivery Person" : "Add New Delivery Person"}
              </DialogTitle>
            </DialogHeader>
            <DeliveryPersonForm
              person={selectedPerson}
              onSave={handleSavePerson}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedPerson(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Daily COD</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryPersons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-xs text-gray-500">{person.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {person.assigned_hostel ? (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Building2 className="w-3 h-3 mr-1" />
                        {person.assigned_hostel}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>{person.phone_number}</TableCell>
                  <TableCell>
                    <Badge variant={person.is_on_shift ? "default" : "secondary"} className={person.is_on_shift ? "bg-green-500" : ""}>
                      {person.is_on_shift ? "On Shift" : "Off Shift"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${(person.account_balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{(person.account_balance || 0).toFixed(0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBalanceDialog({ open: true, person })}
                        className="h-6 w-6"
                        title="Adjust Balance"
                      >
                        <Wallet className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-600">₹{(person.daily_cod_collected || 0).toFixed(0)}</span>
                      {(person.daily_cod_collected || 0) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetDailyCOD(person)}
                          className="h-5 text-xs px-2"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={person.is_blocked ? "destructive" : "default"}
                        className={person.is_blocked ? "bg-red-500" : (person.account_balance || 0) < 0 ? "bg-orange-500" : "bg-green-500"}
                      >
                        {person.is_blocked ? "Blocked" : (person.account_balance || 0) < 0 ? "Auto-Locked" : "Active"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setBlockDialog({ open: true, person })}
                        className={person.is_blocked ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}
                        title={person.is_blocked ? "Unblock" : "Block"}
                      >
                        {person.is_blocked ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedPerson(person);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, person })}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Remove Delivery Person"
        description={`Are you sure you want to remove "${deleteDialog.person?.name}" from your delivery team? This action cannot be undone.`}
        onConfirm={handleDeletePerson}
        onCancel={() => setDeleteDialog({ open: false, person: null })}
        confirmText="Remove"
        cancelText="Cancel"
      />

      <ConfirmDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}
        title={blockDialog.person?.is_blocked ? "Unblock Delivery Person" : "Block Delivery Person"}
        description={
          blockDialog.person?.is_blocked 
            ? `Are you sure you want to unblock "${blockDialog.person?.name}"? They will be able to accept orders again.`
            : `Are you sure you want to block "${blockDialog.person?.name}"? They will no longer be able to accept or see any orders.`
        }
        onConfirm={toggleBlockStatus}
        onCancel={() => setBlockDialog({ open: false, person: null })}
        confirmText={blockDialog.person?.is_blocked ? "Unblock" : "Block"}
        cancelText="Cancel"
      />

      <Dialog open={balanceDialog.open} onOpenChange={(open) => setBalanceDialog({ ...balanceDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Account Balance</DialogTitle>
          </DialogHeader>
          {balanceDialog.person && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{balanceDialog.person.name}</p>
                <p className="text-sm text-gray-600">Current Balance: ₹{(balanceDialog.person.account_balance || 0).toFixed(2)}</p>
                <p className="text-sm text-gray-600">Daily COD: ₹{(balanceDialog.person.daily_cod_collected || 0).toFixed(2)}</p>
              </div>
              
              <div>
                <Label>Adjustment Amount (+ or -)</Label>
                <Input
                  type="number"
                  placeholder="e.g., -500 or 1000"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positive to add, negative to deduct
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBalanceDialog({ open: false, person: null })} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={updateAccountBalance} disabled={!balanceAmount} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Update Balance
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}