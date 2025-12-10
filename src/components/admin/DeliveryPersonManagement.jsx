import React, { useState, useEffect } from "react";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Plus, Edit, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import DeliveryPersonForm from "./DeliveryPersonForm";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function DeliveryPersonManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, person: null });
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Orders</TableHead>
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
                      {person.name}
                    </div>
                  </TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.phone_number}</TableCell>
                  <TableCell className="capitalize">{person.vehicle_type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={person.is_available ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleAvailability(person)}
                    >
                      {person.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {person.current_orders?.length || 0} orders
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
    </div>
  );
}