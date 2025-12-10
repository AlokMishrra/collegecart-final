import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function DeliveryPersonForm({ person, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: person?.name || "",
    email: person?.email || "",
    password: "", // Always start empty for security
    phone_number: person?.phone_number || "",
    vehicle_type: person?.vehicle_type || "bike",
    is_available: person?.is_available ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If editing and password is empty, don't update password
    const dataToSave = { ...formData };
    if (person && !formData.password.trim()) {
      delete dataToSave.password;
    }
    
    // Ensure password is trimmed if provided
    if (dataToSave.password) {
      dataToSave.password = dataToSave.password.trim();
    }
    
    console.log("Saving delivery person data:", dataToSave);
    onSave(dataToSave);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="password">
            Password {person && <span className="text-sm text-gray-500">(leave empty to keep current)</span>}
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            required={!person}
            placeholder={person ? "Leave empty to keep current" : "Enter password"}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone_number}
            onChange={(e) => handleInputChange("phone_number", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="vehicle">Vehicle Type</Label>
        <Select value={formData.vehicle_type} onValueChange={(value) => handleInputChange("vehicle_type", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bike">Bike</SelectItem>
            <SelectItem value="scooter">Scooter</SelectItem>
            <SelectItem value="car">Car</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="available"
          checked={formData.is_available}
          onCheckedChange={(checked) => handleInputChange("is_available", checked)}
        />
        <Label htmlFor="available">Available for delivery</Label>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {person ? "Update Person" : "Add Person"}
        </Button>
      </div>
    </form>
  );
}