import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const HOSTELS = ["Mithali", "Gavaskar", "Virat", "Tendulkar", "Other", "All"];

export default function DeliveryPersonForm({ person, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: person?.name || "",
    email: person?.email || "",
    password: "",
    phone_number: person?.phone_number || "",
    vehicle_type: person?.vehicle_type || "bike",
    assigned_hostel: person?.assigned_hostel || "All",
    is_available: person?.is_available ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (person && !formData.password.trim()) {
      delete dataToSave.password;
    }
    if (dataToSave.password) {
      dataToSave.password = dataToSave.password.trim();
    }
    onSave(dataToSave);
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Full Name</Label>
          <Input value={formData.name} onChange={e => set("name", e.target.value)} required />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Password {person && <span className="text-xs text-gray-400">(leave empty to keep)</span>}</Label>
          <Input type="password" value={formData.password} onChange={e => set("password", e.target.value)} required={!person} placeholder={person ? "Leave empty to keep" : "Enter password"} />
        </div>
        <div>
          <Label>Phone Number</Label>
          <Input value={formData.phone_number} onChange={e => set("phone_number", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Vehicle Type</Label>
          <Select value={formData.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bike">Bike</SelectItem>
              <SelectItem value="scooter">Scooter</SelectItem>
              <SelectItem value="car">Car</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned Hostel</Label>
          <Select value={formData.assigned_hostel} onValueChange={v => set("assigned_hostel", v)}>
            <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
            <SelectContent>
              {HOSTELS.map(h => (
                <SelectItem key={h} value={h}>
                  {h === "All" ? "All Hostels (No restriction)" : h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">Partner can only accept orders from this hostel</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch checked={formData.is_available} onCheckedChange={v => set("is_available", v)} />
        <Label>Available for delivery</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {person ? "Update Person" : "Add Person"}
        </Button>
      </div>
    </form>
  );
}