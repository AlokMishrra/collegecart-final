import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Truck, MapPin, Phone, Package, CheckCircle, Loader2, Lock, User,
  XCircle, AlertTriangle, Power, Clock, Wallet, ChevronRight, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import ShiftSelector from "../components/delivery/ShiftSelector";
import OTPVerificationDialog from "../components/delivery/OTPVerificationDialog";
import WalletDashboard from "../components/delivery/WalletDashboard";
import CODPaymentCollector from "../components/delivery/CODPaymentCollector";
import RaiseQuery from "../components/delivery/RaiseQuery";

export default function Delivery() {
  const [deliveryPerson, setDeliveryPerson] = useState(null);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [showShiftSelector, setShowShiftSelector] = useState(false);
  const [otpDialog, setOtpDialog] = useState({ open: false, order: null });
  const [activeTab, setActiveTab] = useState("orders");
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [loginPopup, setLoginPopup] = useState(null); // { title, message }

  const loadOrders = useCallback(async (personId, person) => {
    const [preparing, outForDelivery, available] = await Promise.all([
      base44.entities.Order.filter({ delivery_person_id: personId, status: "preparing" }, '-created_date', 20).catch(() => []),
      base44.entities.Order.filter({ delivery_person_id: personId, status: "out_for_delivery" }, '-created_date', 20).catch(() => []),
      base44.entities.Order.filter({ status: "confirmed" }, '-created_date', 50).catch(() => []),
    ]);
    setAssignedOrders([...preparing, ...outForDelivery]);
    // Filter available orders by assigned hostel
    const unassigned = available.filter(o => !o.delivery_person_id);
    setAvailableOrders(unassigned);
  }, []);

  const checkShiftExpiry = useCallback(() => {
    // Shift expiry is now managed by admin-defined shifts; no-op here
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const saved = localStorage.getItem('deliveryPerson');
      if (saved) {
        try {
          const person = JSON.parse(saved);
          const fresh = await base44.entities.DeliveryPerson.filter({ id: person.id }).catch(() => []);
          let freshPerson = fresh[0] || person;
          if (freshPerson.is_blocked) {
            localStorage.removeItem('deliveryPerson');
          } else {
            // Auto-offline: if COD cash has not been submitted for >24hr, force offline
            if (freshPerson.wallet_balance < 0 && freshPerson.is_available) {
              const codTxns = await base44.entities.WalletTransaction.filter(
                { delivery_person_id: freshPerson.id, type: "cod_collection" },
                '-created_date', 1
              ).catch(() => []);
              if (codTxns.length > 0) {
                const hoursSince = (Date.now() - new Date(codTxns[0].created_date).getTime()) / (1000 * 60 * 60);
                if (hoursSince >= 24) {
                  await base44.entities.DeliveryPerson.update(freshPerson.id, { is_available: false, current_shift: null });
                  freshPerson = { ...freshPerson, is_available: false, current_shift: null };
                }
              }
            }
            setDeliveryPerson(freshPerson);
            localStorage.setItem('deliveryPerson', JSON.stringify(freshPerson));
            await loadOrders(freshPerson.id, freshPerson);
            // Load today's commission earnings from transactions
            const todayStr = new Date().toDateString();
            const txns = await base44.entities.WalletTransaction.filter({ delivery_person_id: freshPerson.id }, '-created_date', 100).catch(() => []);
            const earn = txns.filter(t => new Date(t.created_date).toDateString() === todayStr && t.type === "delivery_earning").reduce((s, t) => s + (t.amount || 0), 0);
            setTodayEarnings(earn);
            setLifetimeEarnings(freshPerson.lifetime_earnings || 0);
            // Check for unread approval notifications
            const unreadNotifs = await base44.entities.Notification.filter({ user_id: freshPerson.id, is_read: false }).catch(() => []);
            const approvalNotif = unreadNotifs.find(n => n.title?.includes("Approved") || n.title?.includes("Withdrawal") || n.title?.includes("Top-up"));
            if (approvalNotif) {
              setLoginPopup({ id: approvalNotif.id, title: approvalNotif.title, message: approvalNotif.message });
            }
          }
        } catch (e) {
          localStorage.removeItem('deliveryPerson');
        }
      }
      setIsLoading(false);
    };
    init();
  }, [loadOrders, checkShiftExpiry]);

  // Check 24hr COD auto-offline rule
  const checkCODAutoOffline = useCallback(async (person) => {
    if (!person || !person.is_available || (person.wallet_balance || 0) >= 0) return;
    const codTxns = await base44.entities.WalletTransaction.filter(
      { delivery_person_id: person.id, type: "cod_collection" },
      '-created_date', 1
    ).catch(() => []);
    if (codTxns.length > 0) {
      const hoursSince = (Date.now() - new Date(codTxns[0].created_date).getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 24) {
        await base44.entities.DeliveryPerson.update(person.id, { is_available: false, current_shift: null });
        const updated = { ...person, is_available: false, current_shift: null };
        setDeliveryPerson(updated);
        localStorage.setItem('deliveryPerson', JSON.stringify(updated));
      }
    }
  }, []);

  useEffect(() => {
    if (!deliveryPerson) return;
    const interval = setInterval(() => {
      loadOrders(deliveryPerson.id, deliveryPerson).catch(() => {});
      checkCODAutoOffline(deliveryPerson).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [deliveryPerson, loadOrders, checkShiftExpiry, checkCODAutoOffline]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    const all = await base44.entities.DeliveryPerson.list().catch(() => []);
    const found = all.find(p => p.email?.toLowerCase().trim() === loginForm.email.toLowerCase().trim());
    if (!found) { setLoginError("No account found with this email"); setIsLoggingIn(false); return; }
    if (String(found.password).trim() !== String(loginForm.password).trim()) { setLoginError("Incorrect password"); setIsLoggingIn(false); return; }
    if (found.is_blocked) { setLoginError("Account blocked. Contact admin."); setIsLoggingIn(false); return; }
    localStorage.setItem('deliveryPerson', JSON.stringify(found));
    setDeliveryPerson(found);
    await loadOrders(found.id, found);
    // Check for unread approval notifications on login
    const unreadNotifs = await base44.entities.Notification.filter({ user_id: found.id, is_read: false }).catch(() => []);
    const approvalNotif = unreadNotifs.find(n => n.title?.includes("Approved") || n.title?.includes("Withdrawal") || n.title?.includes("Top-up"));
    if (approvalNotif) {
      setLoginPopup({ id: approvalNotif.id, title: approvalNotif.title, message: approvalNotif.message });
    }
    setLoginForm({ email: "", password: "" });
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('deliveryPerson');
    setDeliveryPerson(null);
    setAssignedOrders([]);
    setAvailableOrders([]);
  };

  const handleGoOnline = () => {
    const balance = deliveryPerson.wallet_balance || 0;
    if (balance < 0) {
      alert(`⚠️ You have ₹${Math.abs(balance).toFixed(2)} in COD cash to submit. Please submit to admin first, then you can go online.`);
      setActiveTab("wallet");
      return;
    }
    setShowShiftSelector(true);
  };

  const handleShiftSelected = async (shiftId) => {
    const updated = { ...deliveryPerson, is_available: true, current_shift: shiftId };
    await base44.entities.DeliveryPerson.update(deliveryPerson.id, { is_available: true, current_shift: shiftId });
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
    setShowShiftSelector(false);
  };

  const handleGoOffline = async () => {
    setIsTogglingAvailability(true);
    const updated = { ...deliveryPerson, is_available: false, current_shift: null };
    await base44.entities.DeliveryPerson.update(deliveryPerson.id, { is_available: false, current_shift: null });
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
    setIsTogglingAvailability(false);
  };

  const acceptOrder = async (orderId) => {
    setAcceptingOrderId(orderId);
    const order = availableOrders.find(o => o.id === orderId);
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
    setAssignedOrders(prev => [...prev, { ...order, status: "preparing", delivery_person_id: deliveryPerson.id }]);
    await Promise.all([
      base44.entities.Order.update(orderId, { delivery_person_id: deliveryPerson.id, status: "preparing" }),
      base44.entities.DeliveryPerson.update(deliveryPerson.id, { current_orders: [...(deliveryPerson.current_orders || []), orderId] })
    ]).catch(() => {});
    setAcceptingOrderId(null);
  };

  const markOutForDelivery = async (orderId) => {
    setUpdatingOrderId(orderId);
    const order = assignedOrders.find(o => o.id === orderId);
    setAssignedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "out_for_delivery" } : o));
    await Promise.all([
      base44.entities.Order.update(orderId, { status: "out_for_delivery" }),
      order && base44.entities.Notification.create({ user_id: order.user_id, title: "Order Out for Delivery!", message: `Your order #${order.order_number} is on its way!`, type: "info" })
    ]).catch(() => {});
    setUpdatingOrderId(null);
  };

  const markOrderDelivered = async () => {
    const order = otpDialog.order;
    if (!order) return;
    setUpdatingOrderId(order.id);
    setOtpDialog({ open: false, order: null });

    // Fetch fresh data from DB to avoid stale state earnings bug
    const freshList = await base44.entities.DeliveryPerson.filter({ id: deliveryPerson.id }).catch(() => []);
    const freshPerson = freshList[0] || deliveryPerson;

    // If COD cash not yet collected via CODPaymentCollector, deduct from wallet
    // (partner is now holding this cash and owes it to the store)
    const isCODPending = !order.is_paid && order.payment_method === "cash";
    // Tiered commission: 1 order=₹8, 2 orders=₹12 total, 3 orders=₹15 total
    const activeOrderCount = (freshPerson.current_orders || []).length;
    const commissionTiers = [0, 8, 12, 15];
    const prevTier = commissionTiers[Math.min(activeOrderCount, 3)];
    const newTier = commissionTiers[Math.min(activeOrderCount + 1, 3)];
    const commission = newTier - prevTier > 0 ? newTier - prevTier : 8;
    const codDeduction = isCODPending ? order.total_amount : 0;
    const newTotalDeliveries = (freshPerson.total_deliveries || 0) + 1;
    const newTotalEarnings = (freshPerson.total_earnings || 0) + commission;
    const newLifetimeEarnings = (freshPerson.lifetime_earnings || 0) + commission;
    // Wallet only tracks COD cash owed to store — commission is separate earnings
    const newWalletBalance = (freshPerson.wallet_balance || 0) - codDeduction;

    setAssignedOrders(prev => prev.filter(o => o.id !== order.id));
    setTodayEarnings(prev => prev + commission);
    const updatedPerson = { ...freshPerson, total_deliveries: newTotalDeliveries, total_earnings: newTotalEarnings, lifetime_earnings: newLifetimeEarnings, wallet_balance: newWalletBalance };
    setLifetimeEarnings(newLifetimeEarnings);
    setDeliveryPerson(updatedPerson);
    localStorage.setItem('deliveryPerson', JSON.stringify(updatedPerson));

    const ops = [
      base44.entities.Order.update(order.id, { status: "delivered" }),
      base44.entities.DeliveryPerson.update(deliveryPerson.id, {
        total_deliveries: newTotalDeliveries,
        total_earnings: newTotalEarnings,
        lifetime_earnings: newLifetimeEarnings,
        wallet_balance: newWalletBalance,
        current_orders: (freshPerson.current_orders || []).filter(id => id !== order.id)
      }),
      base44.entities.WalletTransaction.create({
        delivery_person_id: deliveryPerson.id,
        amount: commission,
        type: "delivery_earning",
        description: `Commission for order #${order.order_number}`,
        balance_after: newWalletBalance
      }),
      base44.entities.Notification.create({ user_id: order.user_id, title: "Order Delivered!", message: `Your order #${order.order_number} has been delivered!`, type: "success" })
    ];

    if (isCODPending) {
      ops.push(
        base44.entities.WalletTransaction.create({
          delivery_person_id: deliveryPerson.id,
          amount: -codDeduction,
          type: "cod_collection",
          description: `COD cash collected for order #${order.order_number} — submit ₹${codDeduction.toFixed(2)} to admin`,
          balance_after: newWalletBalance
        })
      );
    }

    await Promise.all(ops).catch(() => {});
    setUpdatingOrderId(null);
  };

  const cancelOrder = async () => {
    if (!orderToCancel || !cancellationReason.trim()) return;
    const orderId = orderToCancel.id;
    const order = assignedOrders.find(o => o.id === orderId);
    setShowCancelDialog(false);
    setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
    await Promise.all([
      base44.entities.Order.update(orderId, { status: "cancelled", delivery_person_id: null, cancellation_reason: cancellationReason, cancelled_by: deliveryPerson.name }),
      base44.entities.DeliveryPerson.update(deliveryPerson.id, { current_orders: (deliveryPerson.current_orders || []).filter(id => id !== orderId) }),
      order && base44.entities.Notification.create({ user_id: order.user_id, title: "Order Cancelled", message: `Your order #${order.order_number} was cancelled. Reason: ${cancellationReason}`, type: "error" })
    ]).catch(() => {});
    setOrderToCancel(null);
    setCancellationReason("");
  };

  const handleCODPaymentSuccess = (newBalance) => {
    const updated = { ...deliveryPerson, wallet_balance: newBalance };
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
  };

  const handleWalletUpdate = (updated) => {
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!deliveryPerson) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Delivery Partner Login</CardTitle>
            <p className="text-gray-500 text-sm mt-1">Access your delivery dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              {loginError && <Alert variant="destructive"><AlertDescription>{loginError}</AlertDescription></Alert>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoggingIn}>
                {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const walletBalance = deliveryPerson.wallet_balance || 0;
  const isNegativeBalance = walletBalance < 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10 px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome, {deliveryPerson.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${deliveryPerson.is_available ? 'text-green-600' : 'text-gray-500'}`}>
              {deliveryPerson.is_available ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button
              onClick={deliveryPerson.is_available ? handleGoOffline : handleGoOnline}
              disabled={isTogglingAvailability}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                deliveryPerson.is_available ? 'bg-green-500' : isNegativeBalance ? 'bg-red-200' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                deliveryPerson.is_available ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* Status Banner */}
      {deliveryPerson.is_available ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              {deliveryPerson.current_shift ? `Shift Active` : "Online"}
            </p>
            <p className="text-xs text-green-600">
              You're online and receiving orders
              {deliveryPerson.assigned_hostel && deliveryPerson.assigned_hostel !== "All"
                ? ` · ${deliveryPerson.assigned_hostel} hostel only`
                : ""}
            </p>
          </div>
          <Badge className="bg-green-500 text-white">ACTIVE</Badge>
        </div>
      ) : !deliveryPerson.is_available && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
          <p className="text-sm text-orange-800">
            {isNegativeBalance
              ? `Submit ₹${Math.abs(walletBalance).toFixed(2)} COD cash first (Wallet tab), then select a shift to go online.`
              : "Select a shift to start receiving orders."}
          </p>
        </div>
      )}

      {/* Negative Balance Warning */}
      {isNegativeBalance && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">Submit COD Cash: ₹{Math.abs(walletBalance).toFixed(2)}</p>
            <p className="text-xs text-red-600 mt-0.5">You must settle this before accepting new orders.</p>
          </div>
          <Button size="sm" onClick={() => setActiveTab("wallet")} className="bg-red-600 hover:bg-red-700 text-white">
            Wallet <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Deliveries", value: deliveryPerson.total_deliveries || 0 },
          { label: "Today's Earnings", value: `₹${todayEarnings.toFixed(0)}`, color: "text-emerald-600" },
          { label: "Lifetime Earnings", value: `₹${(lifetimeEarnings || 0).toFixed(0)}`, color: "text-blue-600" },
          { label: "Active Orders", value: assignedOrders.length },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${stat.color || "text-gray-800"}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">
            <Package className="w-4 h-4 mr-1.5" />Orders
            {(availableOrders.length + assignedOrders.length) > 0 && (
              <Badge className="ml-1.5 bg-emerald-600 text-white text-xs px-1.5">{availableOrders.length + assignedOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="wallet">
            <Wallet className="w-4 h-4 mr-1.5" />Wallet
            {isNegativeBalance && <Badge className="ml-1.5 bg-red-500 text-white text-xs px-1.5">!</Badge>}
          </TabsTrigger>
          <TabsTrigger value="support">
            <MessageSquare className="w-4 h-4 mr-1.5" />Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-5 mt-4">
          {/* Available Orders */}
          {deliveryPerson.is_available && availableOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">New Orders</h2>
                <Badge className="bg-blue-100 text-blue-800">{availableOrders.length}</Badge>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {availableOrders.map(order => (
                    <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge className="bg-blue-500 text-white">NEW</Badge>
                                {order.is_paid ? <Badge className="bg-green-100 text-green-800">PAID</Badge> : <Badge className="bg-yellow-100 text-yellow-800">COD</Badge>}
                                <span className="font-semibold text-sm">#{order.order_number}</span>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /><span>{order.customer_name}</span></div>
                                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /><span>{order.delivery_address}</span></div>
                              </div>
                              <p className="text-xl font-bold text-emerald-600 mt-2">₹{order.total_amount?.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">+₹{(order.total_amount * 0.10).toFixed(2)} commission</p>
                            </div>
                            {(() => {
                              const hostel = (deliveryPerson.assigned_hostel || "").trim();
                              const addr = (order.delivery_address || "").toLowerCase().trim();
                              const canAccept = !hostel || hostel === "All" || addr.includes(hostel.toLowerCase().trim());
                              return (
                                <div className="flex flex-col items-end gap-1 self-start sm:self-auto">
                                  <Button
                                    onClick={() => acceptOrder(order.id)}
                                    disabled={acceptingOrderId === order.id || !canAccept}
                                    className={canAccept ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}
                                  >
                                    {acceptingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Accept</>}
                                  </Button>
                                  {!canAccept && (
                                    <span className="text-[10px] text-orange-500 font-medium">Not your hostel</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Active Deliveries */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">My Active Deliveries ({assignedOrders.length})</h2>
            {assignedOrders.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active deliveries</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {assignedOrders.map(order => (
                    <motion.div key={order.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.status === "preparing"
                              ? <Badge className="bg-purple-100 text-purple-800"><Package className="w-3 h-3 mr-1" />PREPARING</Badge>
                              : <Badge className="bg-orange-100 text-orange-800"><Truck className="w-3 h-3 mr-1" />OUT FOR DELIVERY</Badge>}
                            {order.is_paid ? <Badge className="bg-green-100 text-green-800">PAID</Badge> : <Badge className="bg-yellow-100 text-yellow-800">COD ₹{order.total_amount?.toFixed(0)}</Badge>}
                            <span className="font-semibold text-sm">#{order.order_number}</span>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-start gap-1.5"><User className="w-4 h-4 text-gray-400 mt-0.5" /><span>{order.customer_name}</span></div>
                            <div className="flex items-start gap-1.5"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" /><span>{order.delivery_address}</span></div>
                            <div className="flex items-start gap-1.5"><Phone className="w-4 h-4 text-gray-400 mt-0.5" /><span>{order.phone_number}</span></div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span className="text-gray-700">{item.product_name}</span>
                                <span className="text-gray-400">× {item.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <p className="text-xl font-bold text-emerald-600">₹{order.total_amount?.toFixed(2)}</p>

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => window.open(`tel:${order.phone_number}`)} variant="outline" size="sm">
                              <Phone className="w-4 h-4 mr-1" />Call
                            </Button>
                            {order.status === "preparing" && (
                              <Button onClick={() => markOutForDelivery(order.id)} disabled={updatingOrderId === order.id} className="bg-orange-600 hover:bg-orange-700" size="sm">
                                {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4 mr-1" />Out for Delivery</>}
                              </Button>
                            )}
                            {order.status === "out_for_delivery" && (
                              <>
                                {!order.is_paid && order.payment_method === "cash" && (
                                  <CODPaymentCollector order={order} deliveryPerson={deliveryPerson} onPaymentSuccess={handleCODPaymentSuccess} />
                                )}
                                <Button onClick={() => setOtpDialog({ open: true, order })} disabled={updatingOrderId === order.id} className="bg-green-600 hover:bg-green-700" size="sm">
                                  {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Enter OTP & Deliver</>}
                                </Button>
                              </>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => { setOrderToCancel(order); setCancellationReason(""); setShowCancelDialog(true); }}>
                              <XCircle className="w-4 h-4 mr-1" />Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          <WalletDashboard deliveryPerson={deliveryPerson} onUpdate={handleWalletUpdate} todayEarningsFromParent={todayEarnings} />
        </TabsContent>

        <TabsContent value="support" className="mt-4">
          <RaiseQuery deliveryPerson={deliveryPerson} />
        </TabsContent>
      </Tabs>

      {/* Shift Selector */}
      <ShiftSelector open={showShiftSelector} onSelectShift={handleShiftSelected} onCancel={() => setShowShiftSelector(false)} />

      {/* OTP Verification Dialog */}
      <OTPVerificationDialog
        open={otpDialog.open}
        order={otpDialog.order}
        onClose={() => setOtpDialog({ open: false, order: null })}
        onVerify={markOrderDelivered}
        isLoading={!!updatingOrderId}
      />

      {/* Withdrawal/Deposit Approval Popup */}
      <Dialog open={!!loginPopup} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5 text-emerald-600" />{loginPopup?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 leading-relaxed">{loginPopup?.message}</p>
          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (loginPopup?.id) {
                  await base44.entities.Notification.update(loginPopup.id, { is_read: true }).catch(() => {});
                }
                setLoginPopup(null);
              }}
            >
              OK, Got It!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Cancel Order</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div>
              {orderToCancel && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                  <p className="font-semibold">#{orderToCancel.order_number}</p>
                  <p className="text-gray-500">{orderToCancel.customer_name}</p>
                </div>
              )}
              <div className="mt-2">
                <Label>Reason <span className="text-red-500">*</span></Label>
                <Textarea placeholder="Enter cancellation reason..." value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
          </DialogDescription>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Back</Button>
            <Button variant="destructive" onClick={cancelOrder} disabled={!cancellationReason.trim()}>Confirm Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}