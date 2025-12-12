import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send, Play, Pause, Plus, TrendingUp, Mail, Bell, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function MarketingAutomation() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "both",
    target_segment: "all",
    subject: "",
    message_variant_a: "",
    message_variant_b: "",
    enable_ab_testing: false,
    ab_split_percentage: 50,
    trigger_type: "immediate",
    status: "draft"
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await base44.entities.MarketingCampaign.list("-created_date");
      setCampaigns(data);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
    setIsLoading(false);
  };

  const generateAIMessage = async (variant) => {
    setIsSending(true);
    try {
      const prompt = `Create a ${variant === 'a' ? 'professional and direct' : 'friendly and engaging'} marketing message for CollegeCart grocery delivery service.

Campaign: ${formData.name}
Target Segment: ${formData.target_segment}
Type: ${formData.type === 'email' ? 'Email' : formData.type === 'notification' ? 'Push Notification' : 'Both Email and Notification'}

Requirements:
- ${formData.type === 'notification' || formData.type === 'both' ? 'Keep it concise for notifications (max 100 chars)' : 'Can be longer for email'}
- Personalized and compelling
- Include call-to-action
- Match the tone: ${variant === 'a' ? 'professional' : 'friendly and casual'}
${formData.target_segment !== 'all' ? `- Target ${formData.target_segment} customers specifically` : ''}

Return only the message text, no extra formatting.`;

      const message = await base44.integrations.Core.InvokeLLM({ prompt });
      
      if (variant === 'a') {
        setFormData({...formData, message_variant_a: message});
      } else {
        setFormData({...formData, message_variant_b: message});
      }
    } catch (error) {
      console.error("Error generating message:", error);
    }
    setIsSending(false);
  };

  const handleSave = async () => {
    try {
      if (editingCampaign) {
        await base44.entities.MarketingCampaign.update(editingCampaign.id, formData);
      } else {
        await base44.entities.MarketingCampaign.create(formData);
      }
      
      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Campaign Saved",
        message: `Marketing campaign "${formData.name}" has been saved`,
        type: "success"
      });

      setShowCreateDialog(false);
      setEditingCampaign(null);
      setFormData({
        name: "", type: "both", target_segment: "all", subject: "",
        message_variant_a: "", message_variant_b: "", enable_ab_testing: false,
        ab_split_percentage: 50, trigger_type: "immediate", status: "draft"
      });
      loadCampaigns();
    } catch (error) {
      console.error("Error saving campaign:", error);
    }
  };

  const launchCampaign = async (campaign) => {
    setIsSending(true);
    try {
      const users = await base44.entities.User.list();
      const customers = users.filter(u => u.role !== 'admin');
      
      // Filter by segment
      let targetUsers = customers;
      if (campaign.target_segment !== 'all') {
        const orders = await base44.entities.Order.list();
        targetUsers = customers.filter(customer => {
          const customerOrders = orders.filter(o => o.user_id === customer.id);
          const spending = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);
          
          let segment = 'new';
          if (spending >= 10000) segment = 'vip';
          else if (spending >= 5000) segment = 'gold';
          else if (spending >= 2000) segment = 'silver';
          else if (customerOrders.length > 0) segment = 'bronze';
          
          if (campaign.target_segment === 'inactive') {
            const lastOrder = customerOrders[0];
            return lastOrder && (Date.now() - new Date(lastOrder.created_date).getTime()) > 30 * 24 * 60 * 60 * 1000;
          }
          
          return segment === campaign.target_segment;
        });
      }

      // Send messages with A/B testing
      let variantASent = 0, variantBSent = 0;
      
      for (const user of targetUsers) {
        const useVariantA = !campaign.enable_ab_testing || 
                           Math.random() * 100 < campaign.ab_split_percentage;
        const message = useVariantA ? campaign.message_variant_a : campaign.message_variant_b;
        
        if (campaign.type === 'notification' || campaign.type === 'both') {
          await base44.entities.Notification.create({
            user_id: user.id,
            title: campaign.subject,
            message: message,
            type: "info"
          });
        }

        if (campaign.type === 'email' || campaign.type === 'both') {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: campaign.subject,
            body: message
          });
        }

        if (useVariantA) variantASent++;
        else variantBSent++;
      }

      await base44.entities.MarketingCampaign.update(campaign.id, {
        status: "active",
        sent_count: targetUsers.length,
        variant_a_sent: variantASent,
        variant_b_sent: variantBSent
      });

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Campaign Launched",
        message: `Campaign sent to ${targetUsers.length} customers`,
        type: "success"
      });

      loadCampaigns();
    } catch (error) {
      console.error("Error launching campaign:", error);
      alert("Failed to launch campaign");
    }
    setIsSending(false);
  };

  const getConversionRate = (campaign, variant) => {
    const sent = variant === 'a' ? campaign.variant_a_sent : campaign.variant_b_sent;
    const conversions = variant === 'a' ? campaign.variant_a_conversions : campaign.variant_b_conversions;
    return sent > 0 ? ((conversions / sent) * 100).toFixed(2) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Marketing Automation
          </h2>
          <p className="text-gray-600">Create personalized campaigns with A/B testing</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">A/B Tests Running</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.enable_ab_testing && c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Draft Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'draft').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaigns.map(campaign => (
          <Card key={campaign.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <Badge className={
                      campaign.status === 'active' ? 'bg-green-600' :
                      campaign.status === 'draft' ? 'bg-gray-400' : 'bg-blue-600'
                    }>
                      {campaign.status}
                    </Badge>
                    {campaign.enable_ab_testing && <Badge className="bg-purple-600">A/B Testing</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{campaign.subject}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Target: {campaign.target_segment}</span>
                    <span>Type: {campaign.type}</span>
                    <span>Sent: {campaign.sent_count || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCampaign(campaign);
                      setFormData(campaign);
                      setShowCreateDialog(true);
                    }}
                  >
                    Edit
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => launchCampaign(campaign)}
                      disabled={isSending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Launch
                    </Button>
                  )}
                </div>
              </div>

              {campaign.enable_ab_testing && campaign.status === 'active' && (
                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-blue-900">Variant A</span>
                      <Badge className="bg-blue-600">Professional</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Sent: {campaign.variant_a_sent}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={parseFloat(getConversionRate(campaign, 'a'))} className="flex-1" />
                      <span className="text-sm font-medium">{getConversionRate(campaign, 'a')}%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-purple-900">Variant B</span>
                      <Badge className="bg-purple-600">Friendly</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Sent: {campaign.variant_b_sent}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={parseFloat(getConversionRate(campaign, 'b'))} className="flex-1" />
                      <span className="text-sm font-medium">{getConversionRate(campaign, 'b')}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit' : 'Create'} Marketing Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Holiday Special Offer"
                />
              </div>
              <div>
                <Label>Campaign Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="notification">In-App Notification Only</SelectItem>
                    <SelectItem value="both">Both Email & Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Target Segment</Label>
                <Select value={formData.target_segment} onValueChange={(value) => setFormData({...formData, target_segment: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="vip">VIP Customers</SelectItem>
                    <SelectItem value="gold">Gold Tier</SelectItem>
                    <SelectItem value="silver">Silver Tier</SelectItem>
                    <SelectItem value="bronze">Bronze Tier</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                    <SelectItem value="inactive">Inactive Users (30+ days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger Type</Label>
                <Select value={formData.trigger_type} onValueChange={(value) => setFormData({...formData, trigger_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="behavior_based">Behavior-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Subject / Title</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Enter subject line"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <Label>Enable A/B Testing</Label>
                <p className="text-xs text-gray-600">Test two message variants to optimize performance</p>
              </div>
              <Switch
                checked={formData.enable_ab_testing}
                onCheckedChange={(checked) => setFormData({...formData, enable_ab_testing: checked})}
              />
            </div>

            <Tabs defaultValue="variant-a">
              <TabsList className="w-full">
                <TabsTrigger value="variant-a" className="flex-1">Variant A {!formData.enable_ab_testing && "(Main)"}</TabsTrigger>
                {formData.enable_ab_testing && <TabsTrigger value="variant-b" className="flex-1">Variant B</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="variant-a" className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Message Variant A</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAIMessage('a')}
                    disabled={isSending}
                    className="text-purple-600"
                  >
                    {isSending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Generate
                  </Button>
                </div>
                <Textarea
                  value={formData.message_variant_a}
                  onChange={(e) => setFormData({...formData, message_variant_a: e.target.value})}
                  rows={6}
                  placeholder="Enter your message..."
                />
              </TabsContent>

              {formData.enable_ab_testing && (
                <TabsContent value="variant-b" className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Message Variant B</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAIMessage('b')}
                      disabled={isSending}
                      className="text-purple-600"
                    >
                      {isSending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    value={formData.message_variant_b}
                    onChange={(e) => setFormData({...formData, message_variant_b: e.target.value})}
                    rows={6}
                    placeholder="Enter your message..."
                  />
                </TabsContent>
              )}
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                Save Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}