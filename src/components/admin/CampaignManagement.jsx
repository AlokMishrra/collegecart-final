import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, TrendingUp, Users, DollarSign, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    code: "",
    start_date: "",
    end_date: "",
    usage_limit: 100,
    usage_per_user: 1,
    min_order_amount: 0,
    is_active: true
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await base44.entities.Campaign.list('-created_date');
      setCampaigns(data);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      const campaignData = {
        ...formData,
        code: formData.code.toUpperCase(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (editingCampaign) {
        await base44.entities.Campaign.update(editingCampaign.id, campaignData);
      } else {
        await base44.entities.Campaign.create(campaignData);
      }

      setShowForm(false);
      setEditingCampaign(null);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error("Error saving campaign:", error);
      alert("Failed to save campaign");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await base44.entities.Campaign.delete(id);
      loadCampaigns();
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
      code: campaign.code,
      start_date: campaign.start_date?.split('T')[0] || "",
      end_date: campaign.end_date?.split('T')[0] || "",
      usage_limit: campaign.usage_limit || 100,
      usage_per_user: campaign.usage_per_user || 1,
      min_order_amount: campaign.min_order_amount || 0,
      is_active: campaign.is_active
    });
    setShowForm(true);
  };

  const notifyUsers = async (campaign) => {
    try {
      const users = await base44.entities.User.list();
      for (const user of users) {
        if (user.notification_preferences?.promotions !== false) {
          await base44.entities.Notification.create({
            user_id: user.id,
            title: `🎉 New Offer: ${campaign.name}`,
            message: `Use code ${campaign.code} and get ${campaign.discount_type === 'percentage' ? campaign.discount_value + '%' : '₹' + campaign.discount_value} off!`,
            type: "info"
          });
        }
      }
      alert(`Notification sent to users!`);
    } catch (error) {
      console.error("Error notifying users:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      code: "",
      start_date: "",
      end_date: "",
      usage_limit: 100,
      usage_per_user: 1,
      min_order_amount: 0,
      is_active: true
    });
  };

  const isActive = (campaign) => {
    if (!campaign.is_active) return false;
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return now >= start && now <= end;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Promotional Campaigns</h2>
          <p className="text-gray-600">Create and manage discount campaigns</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingCampaign(null); resetForm(); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.filter(isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Total Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.usage_count || 0), 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              Total Discount Given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{campaigns.reduce((sum, c) => sum + (c.total_discount_given || 0), 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(campaign => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{campaign.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{campaign.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.discount_type === 'percentage' && `${campaign.discount_value}%`}
                    {campaign.discount_type === 'fixed' && `₹${campaign.discount_value}`}
                    {campaign.discount_type === 'free_shipping' && 'Free Shipping'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{campaign.usage_count || 0} / {campaign.usage_limit || '∞'}</p>
                      <p className="text-gray-500">₹{(campaign.total_discount_given || 0).toFixed(2)} off</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={isActive(campaign) ? "bg-green-600" : "bg-gray-400"}>
                      {isActive(campaign) ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleEdit(campaign)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => notifyUsers(campaign)}>
                        <Bell className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => handleDelete(campaign.id)} className="text-red-600">
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

      {/* Campaign Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(value) => setFormData({...formData, discount_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.discount_type !== 'free_shipping' && (
                <div>
                  <Label>Discount Value</Label>
                  <Input type="number" value={formData.discount_value} onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})} />
                </div>
              )}
            </div>
            <div>
              <Label>Discount Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SUMMER25"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                    const code = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                    setFormData(f => ({...f, code}));
                  }}
                  className="flex-shrink-0 text-xs px-3"
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Total Usage Limit</Label>
                <Input type="number" value={formData.usage_limit} onChange={(e) => setFormData({...formData, usage_limit: parseInt(e.target.value)})} />
              </div>
              <div>
                <Label>Usage Per User</Label>
                <Input type="number" value={formData.usage_per_user} onChange={(e) => setFormData({...formData, usage_per_user: parseInt(e.target.value)})} />
              </div>
              <div>
                <Label>Min Order (₹)</Label>
                <Input type="number" value={formData.min_order_amount} onChange={(e) => setFormData({...formData, min_order_amount: parseFloat(e.target.value)})} />
              </div>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                Click the bell icon to send push notifications about this campaign to users who have enabled promotion notifications.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                {editingCampaign ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}