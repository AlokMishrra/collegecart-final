import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Trash2, Users, MapPin, Phone, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function HostelManagement() {
  const [hostels, setHostels] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [deleteHostel, setDeleteHostel] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    contact_person: "",
    contact_phone: "",
    total_rooms: 0,
    assigned_delivery_persons: [],
    is_active: true,
    delivery_radius_km: 2,
    coordinates: { latitude: 0, longitude: 0 }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500); // Delay initial load by 500ms
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hostelsData, deliveryData] = await Promise.all([
        base44.entities.Hostel.list(),
        base44.entities.DeliveryPerson.list()
      ]);
      setHostels(hostelsData);
      setDeliveryPersons(deliveryData);
    } catch (error) {
      console.error("Error loading data:", error);
      // Retry after delay if rate limited
      if (error.message?.includes('Rate limit')) {
        setTimeout(() => loadData(), 3000);
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHostel) {
        await base44.entities.Hostel.update(editingHostel.id, formData);
      } else {
        await base44.entities.Hostel.create(formData);
      }
      
      await base44.entities.Notification.create({
        user_id: "admin",
        title: editingHostel ? "Hostel Updated" : "Hostel Created",
        message: `${formData.name} has been ${editingHostel ? "updated" : "created"} successfully`,
        type: "success"
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving hostel:", error);
    }
  };

  const handleEdit = (hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      code: hostel.code,
      address: hostel.address || "",
      contact_person: hostel.contact_person || "",
      contact_phone: hostel.contact_phone || "",
      total_rooms: hostel.total_rooms || 0,
      assigned_delivery_persons: hostel.assigned_delivery_persons || [],
      is_active: hostel.is_active !== false,
      delivery_radius_km: hostel.delivery_radius_km || 2,
      coordinates: hostel.coordinates || { latitude: 0, longitude: 0 }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteHostel) return;
    try {
      await base44.entities.Hostel.delete(deleteHostel.id);
      await base44.entities.Notification.create({
        user_id: "admin",
        title: "Hostel Deleted",
        message: `${deleteHostel.name} has been removed`,
        type: "info"
      });
      setDeleteHostel(null);
      loadData();
    } catch (error) {
      console.error("Error deleting hostel:", error);
    }
  };

  const resetForm = () => {
    setEditingHostel(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      contact_person: "",
      contact_phone: "",
      total_rooms: 0,
      assigned_delivery_persons: [],
      is_active: true,
      delivery_radius_km: 2,
      coordinates: { latitude: 0, longitude: 0 }
    });
  };

  const toggleDeliveryPerson = (personId) => {
    setFormData(prev => ({
      ...prev,
      assigned_delivery_persons: prev.assigned_delivery_persons.includes(personId)
        ? prev.assigned_delivery_persons.filter(id => id !== personId)
        : [...prev.assigned_delivery_persons, personId]
    }));
  };

  const getDeliveryPersonName = (personId) => {
    const person = deliveryPersons.find(p => p.id === personId);
    return person?.name || "Unknown";
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading hostels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hostel Management</h2>
          <p className="text-gray-600">Manage hostels and assign delivery personnel</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Hostel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHostel ? "Edit Hostel" : "Add New Hostel"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hostel Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Mithali Hostel"
                    required
                  />
                </div>
                <div>
                  <Label>Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., MITH"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full hostel address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="Warden name"
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Rooms</Label>
                  <Input
                    type="number"
                    value={formData.total_rooms}
                    onChange={(e) => setFormData({...formData, total_rooms: parseInt(e.target.value) || 0})}
                    placeholder="Number of rooms"
                  />
                </div>
                <div>
                  <Label>Delivery Radius (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.delivery_radius_km}
                    onChange={(e) => setFormData({...formData, delivery_radius_km: parseFloat(e.target.value) || 2})}
                    placeholder="2.0"
                  />
                </div>
              </div>

              <div>
                <Label>Assigned Delivery Personnel</Label>
                <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {deliveryPersons.length === 0 ? (
                    <p className="text-sm text-gray-500">No delivery personnel available</p>
                  ) : (
                    deliveryPersons.map(person => (
                      <label key={person.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.assigned_delivery_persons.includes(person.id)}
                          onChange={() => toggleDeliveryPerson(person.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{person.name}</span>
                        <Badge variant="outline" className="ml-auto">{person.phone_number}</Badge>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded"
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingHostel ? "Update" : "Create"} Hostel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hostels.map(hostel => (
          <Card key={hostel.id} className={!hostel.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{hostel.name}</CardTitle>
                    <Badge variant={hostel.is_active ? "default" : "secondary"}>
                      {hostel.code}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(hostel)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteHostel(hostel)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hostel.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{hostel.address}</span>
                </div>
              )}
              {hostel.contact_person && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{hostel.contact_person}</span>
                </div>
              )}
              {hostel.contact_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{hostel.contact_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{hostel.assigned_delivery_persons?.length || 0} Delivery Personnel</span>
              </div>
              {hostel.assigned_delivery_persons?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {hostel.assigned_delivery_persons.map(personId => (
                    <Badge key={personId} variant="outline" className="text-xs">
                      {getDeliveryPersonName(personId)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {hostels.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hostels yet</h3>
          <p className="text-gray-600 mb-4">Add your first hostel to start managing deliveries</p>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add First Hostel
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteHostel}
        onClose={() => setDeleteHostel(null)}
        onConfirm={handleDelete}
        title="Delete Hostel"
        description={`Are you sure you want to delete ${deleteHostel?.name}? This action cannot be undone.`}
      />
    </div>
  );
}