import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Truck, Save } from "lucide-react";

export default function SettingsManagement() {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    shipping_charge: 0,
    free_delivery_above: 500,
    first_order_threshold: 100,
    store_name: "CollegeCart",
    store_description: "Your one-stop shop for groceries"
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await base44.entities.Settings.list();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
        setFormData(allSettings[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings) {
        await base44.entities.Settings.update(settings.id, formData);
      } else {
        await base44.entities.Settings.create(formData);
      }
      await loadSettings();
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Store Settings</h2>
        <p className="text-gray-600">Configure your store settings and delivery charges</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipping_charge">Delivery Charge (₹)</Label>
              <Input
                id="shipping_charge"
                type="number"
                step="0.01"
                value={formData.shipping_charge}
                onChange={(e) => setFormData({ ...formData, shipping_charge: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Charge per delivery</p>
            </div>
            <div>
              <Label htmlFor="free_delivery">Free Delivery Above (₹)</Label>
              <Input
                id="free_delivery"
                type="number"
                step="0.01"
                value={formData.free_delivery_above}
                onChange={(e) => setFormData({ ...formData, free_delivery_above: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Regular users free delivery threshold</p>
            </div>
            <div>
              <Label htmlFor="first_order">First Order Threshold (₹)</Label>
              <Input
                id="first_order"
                type="number"
                step="0.01"
                value={formData.first_order_threshold}
                onChange={(e) => setFormData({ ...formData, first_order_threshold: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Special offer for first-time users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="store_name">Store Name</Label>
            <Input
              id="store_name"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="store_description">Store Description</Label>
            <Textarea
              id="store_description"
              rows={3}
              value={formData.store_description}
              onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}