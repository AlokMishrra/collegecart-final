import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Users, TrendingUp, Loader2, Crown, Plus } from "lucide-react";

const PLANS = {
  student: { label: "Student Plan", price: 99 },
  faculty: { label: "Faculty Plan", price: 199 }
};

const STATUS_STYLES = {
  pending_verification: "bg-yellow-100 text-yellow-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600"
};

export default function SubscriptionManagement() {
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [createForm, setCreateForm] = useState({ user_id: "", user_email: "", user_name: "", plan_type: "student", months: 1 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [data, userList] = await Promise.all([
      base44.entities.Subscription.list('-created_date', 200).catch(() => []),
      base44.entities.User.list().catch(() => [])
    ]);
    setSubs(data);
    setUsers(userList);
    setIsLoading(false);
  };

  const getEndDate = (months) => {
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    return end.toISOString();
  };

  const approveSub = async (sub) => {
    setIsProcessing(true);
    const now = new Date();
    await Promise.all([
      base44.entities.Subscription.update(sub.id, {
        status: 'active',
        start_date: now.toISOString(),
        end_date: getEndDate(1),
        admin_notes: ""
      }),
      base44.entities.Notification.create({
        user_id: sub.user_id,
        title: "🎉 Premium Activated!",
        message: `Your ${PLANS[sub.plan_type]?.label} is now active. Enjoy free delivery for 1 month!`,
        type: "success"
      })
    ]);
    await loadData();
    setIsProcessing(false);
  };

  const openRejectDialog = (sub) => {
    setSelectedSub(sub);
    setAdminNotes("");
    setShowRejectDialog(true);
  };

  const rejectSub = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    await Promise.all([
      base44.entities.Subscription.update(selectedSub.id, { status: 'rejected', admin_notes: adminNotes }),
      base44.entities.Notification.create({
        user_id: selectedSub.user_id,
        title: "Subscription Request Rejected",
        message: `Your subscription was not approved. ${adminNotes ? `Reason: ${adminNotes}` : "Please contact support."}`,
        type: "error"
      })
    ]);
    setShowRejectDialog(false);
    setSelectedSub(null);
    await loadData();
    setIsProcessing(false);
  };

  const handleCreateSubscription = async () => {
    if (!createForm.user_id || !createForm.plan_type) return;
    setIsProcessing(true);
    const plan = PLANS[createForm.plan_type];
    const months = parseInt(createForm.months) || 1;
    const now = new Date();
    await Promise.all([
      base44.entities.Subscription.create({
        user_id: createForm.user_id,
        user_email: createForm.user_email,
        user_name: createForm.user_name,
        plan_type: createForm.plan_type,
        status: 'active',
        amount_paid: plan.price * months,
        start_date: now.toISOString(),
        end_date: getEndDate(months),
        upi_id: "admin-created",
        transaction_id: "admin-created"
      }),
      base44.entities.Notification.create({
        user_id: createForm.user_id,
        title: "🎉 Premium Activated!",
        message: `Your ${plan.label} has been activated for ${months} month${months > 1 ? "s" : ""}. Enjoy free delivery!`,
        type: "success"
      })
    ]);
    setShowCreateDialog(false);
    setCreateForm({ user_id: "", user_email: "", user_name: "", plan_type: "student", months: 1 });
    await loadData();
    setIsProcessing(false);
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    setCreateForm(f => ({
      ...f,
      user_id: userId,
      user_email: user?.email || "",
      user_name: user?.full_name || ""
    }));
  };

  const pending = subs.filter(s => s.status === 'pending_verification');
  const active = subs.filter(s => s.status === 'active');
  const revenue = active.reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const SubCard = ({ sub }) => (
    <div className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-gray-900">{sub.user_name || 'Unknown User'}</p>
            <Badge className={STATUS_STYLES[sub.status] || "bg-gray-100 text-gray-600"}>
              {sub.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mb-1 truncate">{sub.user_email}</p>
          <p className="text-sm font-medium text-gray-700">
            {PLANS[sub.plan_type]?.label || sub.plan_type} · ₹{sub.amount_paid} · <span className="text-gray-500 text-xs">₹{PLANS[sub.plan_type]?.price}/month</span>
          </p>
          {sub.upi_id && sub.upi_id !== "admin-created" && (
            <p className="text-xs text-gray-500 mt-1">UPI: <span className="font-mono text-blue-600">{sub.upi_id}</span></p>
          )}
          {sub.transaction_id && sub.transaction_id !== "admin-created" && (
            <p className="text-xs text-gray-500">TXN: <span className="font-mono text-emerald-600">{sub.transaction_id}</span></p>
          )}
          {sub.status === 'active' && sub.start_date && sub.end_date && (
            <p className="text-xs text-emerald-600 mt-1">
              ✓ {new Date(sub.start_date).toLocaleDateString('en-IN')} → {new Date(sub.end_date).toLocaleDateString('en-IN')}
            </p>
          )}
          {sub.admin_notes && <p className="text-xs text-red-500 mt-1 italic">Note: {sub.admin_notes}</p>}
          <p className="text-[10px] text-gray-400 mt-1">
            {new Date(sub.created_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {sub.status === 'pending_verification' && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button size="sm" onClick={() => approveSub(sub)} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => openRejectDialog(sub)} disabled={isProcessing} className="text-xs">
              <XCircle className="w-3.5 h-3.5 mr-1" />Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />Subscription Management
          </h2>
          <p className="text-gray-500 text-sm">Student ₹99/mo · Faculty ₹199/mo</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white flex-shrink-0">
          <Plus className="w-4 h-4 mr-1" />Add Subscription
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{pending.length}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700">{active.length}</p>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">₹{revenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending">
              Pending{pending.length > 0 && <Badge className="ml-1.5 bg-yellow-500 text-white text-xs px-1.5">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="all">All ({subs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-3 space-y-3">
            {pending.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No pending requests</p> : pending.map(sub => <SubCard key={sub.id} sub={sub} />)}
          </TabsContent>
          <TabsContent value="active" className="mt-3 space-y-3">
            {active.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No active subscriptions</p> : active.map(sub => <SubCard key={sub.id} sub={sub} />)}
          </TabsContent>
          <TabsContent value="all" className="mt-3 space-y-3">
            {subs.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No subscriptions yet</p> : subs.map(sub => <SubCard key={sub.id} sub={sub} />)}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Subscription Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" />Create Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Select User</Label>
              <Select onValueChange={handleUserSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Plan</Label>
              <Select value={createForm.plan_type} onValueChange={v => setCreateForm(f => ({ ...f, plan_type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student — ₹99/month</SelectItem>
                  <SelectItem value="faculty">Faculty — ₹199/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duration (months)</Label>
              <Input type="number" min={1} max={12} value={createForm.months} onChange={e => setCreateForm(f => ({ ...f, months: e.target.value }))} className="mt-1" />
              <p className="text-xs text-gray-400 mt-1">
                Total: ₹{(PLANS[createForm.plan_type]?.price || 0) * (parseInt(createForm.months) || 1)} · Valid till: {new Date(getEndDate(parseInt(createForm.months) || 1)).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSubscription} disabled={isProcessing || !createForm.user_id} className="bg-yellow-500 hover:bg-yellow-600">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reject Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Rejecting <strong>{selectedSub?.user_name}</strong> — {PLANS[selectedSub?.plan_type]?.label}</p>
            <div>
              <Label>Reason (sent to user)</Label>
              <Textarea placeholder="Enter rejection reason..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={rejectSub} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}