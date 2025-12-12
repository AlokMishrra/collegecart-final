import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    order_updates: true,
    promotions: true,
    loyalty_milestones: true,
    new_products: false,
    price_drops: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const user = await User.me();
      if (user.notification_preferences) {
        setPreferences(user.notification_preferences);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({
        notification_preferences: preferences
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences");
    }
    setIsSaving(false);
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order_updates">Order Updates</Label>
              <p className="text-sm text-gray-500">
                Get notified about order confirmations, delivery status
              </p>
            </div>
            <Switch
              id="order_updates"
              checked={preferences.order_updates}
              onCheckedChange={(checked) => updatePreference("order_updates", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="promotions">Promotions & Offers</Label>
              <p className="text-sm text-gray-500">
                Receive updates about special offers and discounts
              </p>
            </div>
            <Switch
              id="promotions"
              checked={preferences.promotions}
              onCheckedChange={(checked) => updatePreference("promotions", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="loyalty_milestones">Loyalty Rewards</Label>
              <p className="text-sm text-gray-500">
                Notifications for points earned and milestones achieved
              </p>
            </div>
            <Switch
              id="loyalty_milestones"
              checked={preferences.loyalty_milestones}
              onCheckedChange={(checked) => updatePreference("loyalty_milestones", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new_products">New Products</Label>
              <p className="text-sm text-gray-500">
                Be the first to know about new arrivals
              </p>
            </div>
            <Switch
              id="new_products"
              checked={preferences.new_products}
              onCheckedChange={(checked) => updatePreference("new_products", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="price_drops">Price Drops</Label>
              <p className="text-sm text-gray-500">
                Get alerted when products you viewed go on sale
              </p>
            </div>
            <Switch
              id="price_drops"
              checked={preferences.price_drops}
              onCheckedChange={(checked) => updatePreference("price_drops", checked)}
            />
          </div>
        </div>

        <Button
          onClick={savePreferences}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            isSaving ? "Saving..." : "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}