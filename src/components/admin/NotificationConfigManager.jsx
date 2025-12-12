import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { id: "low_stock", label: "Low Stock Alert", icon: "📦" },
  { id: "fraud_alert", label: "Fraud Detection", icon: "🚨" },
  { id: "order_status_change", label: "Order Status Change", icon: "📋" },
  { id: "delivery_delay", label: "Delivery Delay", icon: "🚚" },
  { id: "campaign_launch", label: "Campaign Launch", icon: "📢" }
];

export default function NotificationConfigManager() {
  const [configs, setConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const data = await base44.entities.NotificationConfig.list();
    setConfigs(data);
  };

  const saveConfig = async (config) => {
    try {
      if (config.id) {
        await base44.entities.NotificationConfig.update(config.id, config);
      } else {
        await base44.entities.NotificationConfig.create(config);
      }
      toast.success("Configuration saved");
      loadConfigs();
      setEditingConfig(null);
    } catch (error) {
      toast.error("Failed to save configuration");
    }
  };

  const getConfigForEvent = (eventType) => {
    return configs.find(c => c.event_type === eventType) || {
      event_type: eventType,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      recipients: [],
      threshold: {}
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          Notification Configuration
        </h2>
        <p className="text-gray-600">Configure email, SMS, and in-app notifications for critical events</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {EVENT_TYPES.map(event => {
          const config = getConfigForEvent(event.id);
          const isEditing = editingConfig?.event_type === event.id;

          return (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>{event.icon}</span>
                    {event.label}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingConfig(isEditing ? null : config)}
                  >
                    {isEditing ? "Cancel" : "Configure"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <Label>Email Notifications</Label>
                      </div>
                      <Switch
                        checked={editingConfig.email_enabled}
                        onCheckedChange={(checked) => 
                          setEditingConfig({...editingConfig, email_enabled: checked})
                        }
                      />
                    </div>

                    {editingConfig.email_enabled && (
                      <div>
                        <Label className="text-xs">Email Recipients (comma-separated)</Label>
                        <Input
                          placeholder="admin@example.com, manager@example.com"
                          value={editingConfig.recipients?.join(", ") || ""}
                          onChange={(e) => 
                            setEditingConfig({
                              ...editingConfig, 
                              recipients: e.target.value.split(",").map(s => s.trim())
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <Label>SMS Notifications</Label>
                      </div>
                      <Switch
                        checked={editingConfig.sms_enabled}
                        onCheckedChange={(checked) => 
                          setEditingConfig({...editingConfig, sms_enabled: checked})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <Label>In-App Notifications</Label>
                      </div>
                      <Switch
                        checked={editingConfig.in_app_enabled}
                        onCheckedChange={(checked) => 
                          setEditingConfig({...editingConfig, in_app_enabled: checked})
                        }
                      />
                    </div>

                    {event.id === "low_stock" && (
                      <div>
                        <Label className="text-xs">Stock Alert Threshold</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={editingConfig.threshold?.stock_level || ""}
                          onChange={(e) => 
                            setEditingConfig({
                              ...editingConfig, 
                              threshold: {...editingConfig.threshold, stock_level: parseInt(e.target.value)}
                            })
                          }
                        />
                      </div>
                    )}

                    {event.id === "fraud_alert" && (
                      <div>
                        <Label className="text-xs">Fraud Score Threshold (0-100)</Label>
                        <Input
                          type="number"
                          placeholder="70"
                          value={editingConfig.threshold?.fraud_score || ""}
                          onChange={(e) => 
                            setEditingConfig({
                              ...editingConfig, 
                              threshold: {...editingConfig.threshold, fraud_score: parseInt(e.target.value)}
                            })
                          }
                        />
                      </div>
                    )}

                    <Button
                      onClick={() => saveConfig(editingConfig)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {config.email_enabled && <Badge variant="outline">Email</Badge>}
                      {config.sms_enabled && <Badge variant="outline">SMS</Badge>}
                      {config.in_app_enabled && <Badge variant="outline">In-App</Badge>}
                      {!config.email_enabled && !config.sms_enabled && !config.in_app_enabled && (
                        <span className="text-sm text-gray-500">Not configured</span>
                      )}
                    </div>
                    {config.recipients?.length > 0 && (
                      <p className="text-xs text-gray-600">
                        Recipients: {config.recipients.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}