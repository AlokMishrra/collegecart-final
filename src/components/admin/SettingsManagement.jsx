import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Truck, Save, Wallet, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SettingsManagement() {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    shipping_charge: 0,
    free_delivery_above: 500,
    first_order_threshold: 100,
    store_name: "CollegeCart",
    store_description: "Your one-stop shop for groceries",
    store_upi_id: "",
    is_online: true
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

      {/* Website ON/OFF Toggle */}
      <Card className={`border-2 ${formData.is_online ? 'border-emerald-300' : 'border-red-300'}`}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.is_online ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Power className={`w-5 h-5 ${formData.is_online ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="font-bold text-gray-900">Website Status</p>
              <p className="text-sm text-gray-500">{formData.is_online ? '🟢 Store is OPEN — accepting orders' : '🔴 Store is CLOSED — orders blocked'}</p>
            </div>
          </div>
          <Switch
            checked={!!formData.is_online}
            onCheckedChange={(checked) => setFormData({ ...formData, is_online: checked })}
          />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Delivery Partner Wallet Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="store_upi_id">Store UPI ID (for delivery partner wallet top-ups)</Label>
            <Input
              id="store_upi_id"
              placeholder="e.g. collegecart@upi"
              value={formData.store_upi_id || ""}
              onChange={(e) => setFormData({ ...formData, store_upi_id: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Delivery partners will pay to this UPI ID when adding money to their wallet. A QR code will be auto-generated.</p>
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