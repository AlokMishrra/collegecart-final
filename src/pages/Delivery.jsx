import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import {
  Truck, MapPin, Phone, Package, CheckCircle, Loader2, Lock, User,
  Bell, XCircle, AlertTriangle, Power, Clock, Wallet, Sun, Moon
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
import ShiftSelector, { SHIFT_CONFIG } from "../components/delivery/ShiftSelector";
import OTPVerificationDialog from "../components/delivery/OTPVerificationDialog";
import WalletDashboard from "../components/delivery/WalletDashboard";
import DeliveryNotifications from "../components/delivery/DeliveryNotifications";
import DeliveryStats from "../components/delivery/DeliveryStats";
import CODPaymentCollector from "../components/delivery/CODPaymentCollector";
import SwipeToDeliver from "../components/delivery/SwipeToDeliver";

function DeliveryOrderItem({ item }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    base44.entities.Product.filter({ id: item.product_id }).then(r => setProduct(r[0] || null)).catch(() => {});
  }, [item.product_id]);
  return (
    <div className="flex items-start gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0"></div>
      <div>
        <p className="text-sm text-gray-900 font-medium">{item.product_name} <span className="text-gray-500">× {item.quantity}</span></p>
        {product?.source_dhaba && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">📍 {product.source_dhaba}</span>
        )}
      </div>
    </div>
  );
}

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
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [showShiftSelector, setShowShiftSelector] = useState(false);
  const [otpDialog, setOtpDialog] = useState({ open: false, order: null });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [activeTab, setActiveTab] = useState("orders");

  const loadAssignedOrders = useCallback(async (personId) => {
    const [preparing, outForDelivery] = await Promise.all([
      Order.filter({ delivery_person_id: personId, status: "preparing" }, '-created_date', 20).catch(() => []),
      Order.filter({ delivery_person_id: personId, status: "out_for_delivery" }, '-created_date', 20).catch(() => [])
    ]);
    setAssignedOrders([...preparing, ...outForDelivery]);
  }, []);

  const loadAvailableOrders = useCallback(async () => {
    const orders = await Order.filter({ status: "confirmed" }, '-created_date', 50).catch(() => []);
    const unassigned = orders.filter(o => !o.delivery_person_id);
    if (previousOrderCount > 0 && unassigned.length > previousOrderCount) {
      showBrowserNotification(`🎉 New Order Available!`, `Check the app now!`);
    }
    setPreviousOrderCount(unassigned.length);
    setAvailableOrders(unassigned);
  }, [previousOrderCount]);

  const checkShiftExpiry = useCallback((person) => {
    if (!person?.current_shift || !person?.is_available) return;
    const shift = SHIFT_CONFIG[person.current_shift];
    if (!shift) return;
    const now = new Date();
    const currentHour = now.getHours();
    const endHour = shift.endHour === 24 ? 0 : shift.endHour;
    const isExpired = shift.endHour === 24
      ? currentHour === 0 && now.getMinutes() >= 0
      : currentHour >= shift.endHour;
    if (isExpired) {
      DeliveryPerson.update(person.id, { is_available: false, current_shift: null }).catch(() => {});
      const updated = { ...person, is_available: false, current_shift: null };
      setDeliveryPerson(updated);
      localStorage.setItem('deliveryPerson', JSON.stringify(updated));
    }
  }, []);

  const checkDeliveryLogin = useCallback(async () => {
    setIsLoading(true);
    const saved = localStorage.getItem('deliveryPerson');
    if (saved) {
      const person = JSON.parse(saved);
      // Refresh from DB
      const fresh = await DeliveryPerson.filter({ id: person.id }).catch(() => [person]);
      const freshPerson = fresh[0] || person;
      if (freshPerson.is_blocked) {
        localStorage.removeItem('deliveryPerson');
      } else {
        setDeliveryPerson(freshPerson);
        localStorage.setItem('deliveryPerson', JSON.stringify(freshPerson));
        checkShiftExpiry(freshPerson);
        await Promise.all([loadAssignedOrders(freshPerson.id), loadAvailableOrders()]);
      }
    }
    setIsLoading(false);
  }, [loadAssignedOrders, loadAvailableOrders, checkShiftExpiry]);

  useEffect(() => { checkDeliveryLogin(); }, [checkDeliveryLogin]);

  useEffect(() => {
    if (!deliveryPerson) return;
    const interval = setInterval(() => {
      loadAvailableOrders().catch(() => {});
      checkShiftExpiry(deliveryPerson);
    }, 15000);
    return () => clearInterval(interval);
  }, [deliveryPerson, loadAvailableOrders, checkShiftExpiry]);

  useEffect(() => {
    if (deliveryPerson) {
      if ('Notification' in window) setNotificationsEnabled(Notification.permission === 'granted');
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
      }
    }
  }, [deliveryPerson]);

  const showBrowserNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body }).onclick = () => window.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    const all = await DeliveryPerson.list().catch(() => []);
    const found = all.find(p => p.email?.toLowerCase().trim() === loginForm.email.toLowerCase().trim());
    if (!found) { setLoginError("No account found with this email"); setIsLoggingIn(false); return; }
    if (String(found.password).trim() !== String(loginForm.password).trim()) { setLoginError("Incorrect password"); setIsLoggingIn(false); return; }
    if (found.is_blocked) { setLoginError("Account blocked. Contact admin."); setIsLoggingIn(false); return; }
    localStorage.setItem('deliveryPerson', JSON.stringify(found));
    setDeliveryPerson(found);
    await Promise.all([loadAssignedOrders(found.id), loadAvailableOrders()]);
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
      alert(`You must submit ₹${Math.abs(balance).toFixed(2)} COD cash before going online. Go to Wallet tab.`);
      setActiveTab("wallet");
      return;
    }
    setShowShiftSelector(true);
  };

  const handleShiftSelected = async (shiftId) => {
    const updated = { ...deliveryPerson, is_available: true, current_shift: shiftId };
    await DeliveryPerson.update(deliveryPerson.id, { is_available: true, current_shift: shiftId });
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
    setShowShiftSelector(false);
  };

  const handleGoOffline = async () => {
    setIsTogglingAvailability(true);
    const updated = { ...deliveryPerson, is_available: false, current_shift: null };
    await DeliveryPerson.update(deliveryPerson.id, { is_available: false, current_shift: null });
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
      Order.update(orderId, { delivery_person_id: deliveryPerson.id, status: "preparing" }),
      DeliveryPerson.update(deliveryPerson.id, { current_orders: [...(deliveryPerson.current_orders || []), orderId] })
    ]).catch(() => {});
    setAcceptingOrderId(null);
  };

  const markOutForDelivery = async (orderId) => {
    setUpdatingOrderId(orderId);
    const order = assignedOrders.find(o => o.id === orderId);
    setAssignedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "out_for_delivery" } : o));
    await Promise.all([
      Order.update(orderId, { status: "out_for_delivery" }),
      order && Notification.create({ user_id: order.user_id, title: "Order Out for Delivery!", message: `Your order #${order.order_number} is on its way!`, type: "info" })
    ]).catch(() => {});
    setUpdatingOrderId(null);
  };

  const handleDeliverWithOTP = (order) => {
    setOtpDialog({ open: true, order });
  };

  const markOrderDelivered = async () => {
    const order = otpDialog.order;
    if (!order) return;
    setUpdatingOrderId(order.id);
    setOtpDialog({ open: false, order: null });

    const commission = order.total_amount * 0.10;
    const newTotalDeliveries = (deliveryPerson.total_deliveries || 0) + 1;
    const newTotalEarnings = (deliveryPerson.total_earnings || 0) + commission;
    // Add commission to wallet
    const newWalletBalance = (deliveryPerson.wallet_balance || 0) + commission;

    setAssignedOrders(prev => prev.filter(o => o.id !== order.id));
    const updatedPerson = { ...deliveryPerson, total_deliveries: newTotalDeliveries, total_earnings: newTotalEarnings, wallet_balance: newWalletBalance };
    setDeliveryPerson(updatedPerson);
    localStorage.setItem('deliveryPerson', JSON.stringify(updatedPerson));

    await Promise.all([
      Order.update(order.id, { status: "delivered" }),
      DeliveryPerson.update(deliveryPerson.id, {
        total_deliveries: newTotalDeliveries,
        total_earnings: newTotalEarnings,
        wallet_balance: newWalletBalance,
        current_orders: (deliveryPerson.current_orders || []).filter(id => id !== order.id)
      }),
      base44.entities.WalletTransaction.create({
        delivery_person_id: deliveryPerson.id,
        amount: commission,
        type: "delivery_earning",
        description: `Commission for order #${order.order_number}`,
        balance_after: newWalletBalance
      }),
      Notification.create({ user_id: order.user_id, title: "Order Delivered!", message: `Your order #${order.order_number} has been delivered!`, type: "success" })
    ]).catch(() => {});
    setUpdatingOrderId(null);
  };

  const cancelOrder = async () => {
    if (!orderToCancel || !cancellationReason.trim()) return;
    const orderId = orderToCancel.id;
    const order = assignedOrders.find(o => o.id === orderId);
    setShowCancelDialog(false);
    setCancellingOrderId(orderId);
    setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
    await Promise.all([
      Order.update(orderId, { status: "cancelled", delivery_person_id: null, cancellation_reason: cancellationReason, cancelled_by: deliveryPerson.name }),
      DeliveryPerson.update(deliveryPerson.id, { current_orders: (deliveryPerson.current_orders || []).filter(id => id !== orderId) }),
      order && Notification.create({ user_id: order.user_id, title: "Order Cancelled", message: `Your order #${order.order_number} was cancelled. Reason: ${cancellationReason}`, type: "error" })
    ]).catch(() => {});
    setCancellingOrderId(null);
    setOrderToCancel(null);
    setCancellationReason("");
  };

  const handleCODPaymentSuccess = (newBalance) => {
    const updated = { ...deliveryPerson, wallet_balance: newBalance };
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
    loadAssignedOrders(deliveryPerson.id);
  };

  const handleWalletUpdate = (updated) => {
    setDeliveryPerson(updated);
    localStorage.setItem('deliveryPerson', JSON.stringify(updated));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" /></div>;
  }

  if (!deliveryPerson) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Delivery Partner Login</CardTitle>
            <p className="text-gray-600 text-sm">Access your delivery dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={loginForm.email} onChange={(e) => setLoginForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
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

  const shift = deliveryPerson.current_shift ? SHIFT_CONFIG[deliveryPerson.current_shift] : null;
  const walletBalance = deliveryPerson.wallet_balance || 0;
  const isNegativeBalance = walletBalance < 0;
  const canGoOnline = walletBalance >= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">
      <DeliveryNotifications deliveryPersonEmail={deliveryPerson.email} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {deliveryPerson.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {deliveryPerson.is_available ? (
            <Button onClick={handleGoOffline} disabled={isTogglingAvailability}
              className="bg-green-600 hover:bg-green-700 text-white">
              {isTogglingAvailability ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Power className="w-4 h-4 mr-1" />}
              ONLINE
            </Button>
          ) : (
            <Button onClick={handleGoOnline} variant="outline"
              className={`border-2 ${canGoOnline ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50" : "border-red-400 text-red-600 hover:bg-red-50"}`}>
              <Power className="w-4 h-4 mr-1" />
              Go Online
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* Shift Status Banner */}
      {deliveryPerson.is_available && shift ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">{shift.label} — {shift.time}</p>
            <p className="text-xs text-green-600">You're online and receiving orders</p>
          </div>
          <Badge className="ml-auto bg-green-500 text-white">ACTIVE</Badge>
        </div>
      ) : !deliveryPerson.is_available && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">You are OFFLINE</p>
            <p className="text-xs text-orange-600">
              {isNegativeBalance
                ? `Submit ₹${Math.abs(walletBalance).toFixed(2)} COD cash first, then select a shift to go online.`
                : "Select a shift to start receiving orders."}
            </p>
          </div>
        </div>
      )}

      {/* Negative Balance Warning */}
      {isNegativeBalance && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">COD Cash Submission Required</p>
            <p className="text-sm text-red-600 mt-1">You collected ₹{Math.abs(walletBalance).toFixed(2)} in COD payments. Submit this cash to admin to go online.</p>
          </div>
          <Button size="sm" onClick={() => setActiveTab("wallet")} className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
            Go to Wallet
          </Button>
        </div>
      )}

      {/* Stats */}
      <DeliveryStats deliveryPerson={deliveryPerson} />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="w-4 h-4" />
            Orders
            {(availableOrders.length + assignedOrders.length) > 0 && (
              <Badge className="ml-1 bg-emerald-600 text-xs">{availableOrders.length + assignedOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-1.5">
            <Wallet className="w-4 h-4" />
            Wallet
            {isNegativeBalance && <Badge className="ml-1 bg-red-500 text-xs">!</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-4">
          {/* Available Orders */}
          {deliveryPerson.is_available && availableOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold">New Orders</h2>
                <Badge className="bg-blue-100 text-blue-800">{availableOrders.length}</Badge>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {availableOrders.map((order, i) => (
                    <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className="bg-blue-500 text-white">NEW</Badge>
                                {order.is_paid && <Badge className="bg-green-100 text-green-800">PAID</Badge>}
                                {!order.is_paid && <Badge className="bg-yellow-100 text-yellow-800">COD</Badge>}
                                <span className="font-semibold">#{order.order_number}</span>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" /><span>{order.customer_name}</span></div>
                                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /><span>{order.delivery_address}</span></div>
                              </div>
                              <p className="text-xl font-bold text-emerald-600 mt-2">₹{order.total_amount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Commission: ₹{(order.total_amount * 0.10).toFixed(2)}</p>
                            </div>
                            <Button onClick={() => acceptOrder(order.id)} disabled={acceptingOrderId === order.id} className="bg-blue-600 hover:bg-blue-700 self-start sm:self-center">
                              {acceptingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Accept</>}
                            </Button>
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
            <h2 className="text-lg font-semibold mb-3">My Active Deliveries ({assignedOrders.length})</h2>
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
                  {assignedOrders.map((order, i) => (
                    <motion.div key={order.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {order.status === "preparing"
                                  ? <Badge className="bg-purple-100 text-purple-800"><Package className="w-3 h-3 mr-1" />PREPARING</Badge>
                                  : <Badge className="bg-orange-100 text-orange-800"><Truck className="w-3 h-3 mr-1" />OUT FOR DELIVERY</Badge>}
                                {order.is_paid ? <Badge className="bg-green-100 text-green-800">PAID</Badge> : <Badge className="bg-yellow-100 text-yellow-800">COD</Badge>}
                                <span className="font-semibold">#{order.order_number}</span>
                              </div>
                              <div className="grid sm:grid-cols-3 gap-2 text-sm mb-3">
                                <div className="flex items-start gap-1.5"><User className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="font-medium">{order.customer_name}</p></div></div>
                                <div className="flex items-start gap-1.5"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" /><div><p>{order.delivery_address}</p></div></div>
                                <div className="flex items-start gap-1.5"><Phone className="w-4 h-4 text-gray-400 mt-0.5" /><div><p>{order.phone_number}</p></div></div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                                {order.items?.map((item, idx) => <DeliveryOrderItem key={idx} item={item} />)}
                              </div>
                              <p className="text-xl font-bold text-emerald-600">₹{order.total_amount.toFixed(2)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => window.open(`tel:${order.phone_number}`)} variant="outline" size="sm">
                                <Phone className="w-4 h-4 mr-1" />Call
                              </Button>
                              {order.status === "preparing" && (
                                <Button onClick={() => markOutForDelivery(order.id)} disabled={updatingOrderId === order.id}
                                  className="bg-orange-600 hover:bg-orange-700" size="sm">
                                  {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4 mr-1" />Out for Delivery</>}
                                </Button>
                              )}
                              {order.status === "out_for_delivery" && (
                                <>
                                  {!order.is_paid && order.payment_method === "cash" && (
                                    <CODPaymentCollector order={order} deliveryPerson={deliveryPerson} onPaymentSuccess={handleCODPaymentSuccess} />
                                  )}
                                  <Button onClick={() => handleDeliverWithOTP(order)} disabled={updatingOrderId === order.id}
                                    className="bg-green-600 hover:bg-green-700" size="sm">
                                    {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Enter OTP & Deliver</>}
                                  </Button>
                                </>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => { setOrderToCancel(order); setCancellationReason(""); setShowCancelDialog(true); }}
                                disabled={cancellingOrderId === order.id}>
                                <XCircle className="w-4 h-4 mr-1" />Cancel
                              </Button>
                            </div>
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
          <WalletDashboard deliveryPerson={deliveryPerson} onUpdate={handleWalletUpdate} />
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

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div><DialogTitle>Cancel Order</DialogTitle></div>
          </DialogHeader>
          <DialogDescription asChild>
            <div>
              {orderToCancel && <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm"><p className="font-semibold">Order #{orderToCancel.order_number}</p><p className="text-gray-500">{orderToCancel.customer_name}</p></div>}
              <div>
                <Label htmlFor="reason" className="text-sm font-medium">Reason <span className="text-red-500">*</span></Label>
                <Textarea id="reason" placeholder="Enter cancellation reason..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
          </DialogDescription>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Back</Button>
            <Button variant="destructive" onClick={cancelOrder} disabled={!cancellationReason.trim()}>Confirm Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}