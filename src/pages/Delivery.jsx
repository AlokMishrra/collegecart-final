import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { Truck, MapPin, Phone, Package, CheckCircle, Loader2, Lock, User, Bell, XCircle, AlertTriangle, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
  import DeliveryStats from "../components/delivery/DeliveryStats";
  import DeliveryNotifications from "../components/delivery/DeliveryNotifications";
  import CODQRGenerator from "../components/delivery/CODQRGenerator";
  import DeliveryAI from "../components/delivery/DeliveryAI";
  import SwipeToDeliver from "../components/delivery/SwipeToDeliver";
  import LiveLocationTracker from "../components/delivery/LiveLocationTracker";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  const loadAssignedOrders = useCallback(async (deliveryPersonId) => {
    try {
      // Verify delivery person is not blocked before loading orders
      const persons = await DeliveryPerson.filter({ id: deliveryPersonId });
      if (persons.length > 0 && persons[0].is_blocked) {
        // Person is blocked, clear everything and logout
        localStorage.removeItem('deliveryPerson');
        setDeliveryPerson(null);
        setAssignedOrders([]);
        setAvailableOrders([]);
        return;
      }

      // Load both preparing and out_for_delivery orders
      const [preparingOrders, outForDeliveryOrders] = await Promise.all([
        Order.filter({ delivery_person_id: deliveryPersonId, status: "preparing" }),
        Order.filter({ delivery_person_id: deliveryPersonId, status: "out_for_delivery" })
      ]);
      setAssignedOrders([...preparingOrders, ...outForDeliveryOrders]);
    } catch (error) {
      console.error("Error loading assigned orders:", error);
    }
  }, []);

  const loadAvailableOrders = useCallback(async () => {
    try {
      const orders = await Order.filter({
        status: "confirmed"
      }, '-created_date');
      // Only show orders without delivery person assigned
      const unassignedOrders = orders.filter(order => !order.delivery_person_id);
      
      // Check for new orders and show browser notification (only if delivery person is available)
      const savedPerson = localStorage.getItem('deliveryPerson');
      if (savedPerson) {
        const person = JSON.parse(savedPerson);
        if (person.is_available && previousOrderCount > 0 && unassignedOrders.length > previousOrderCount) {
          const newOrdersCount = unassignedOrders.length - previousOrderCount;
          showBrowserNotification(
            `🎉 ${newOrdersCount} New Order${newOrdersCount > 1 ? 's' : ''} Available!`,
            `${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} ready for pickup. Check the app now!`
          );
        }
      }
      
      setPreviousOrderCount(unassignedOrders.length);
      setAvailableOrders(unassignedOrders);
    } catch (error) {
      console.error("Error loading available orders:", error);
    }
  }, [previousOrderCount]);

  const checkDeliveryLogin = useCallback(async () => {
    setIsLoading(true);
    
    // Check if user is admin first
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role === 'admin') {
        // Admin can access without delivery login
        const savedDeliveryPerson = localStorage.getItem('deliveryPerson');
        if (savedDeliveryPerson) {
          try {
            const person = JSON.parse(savedDeliveryPerson);
            setDeliveryPerson(person);
            await Promise.all([
              loadAssignedOrders(person.id),
              loadAvailableOrders()
            ]);
          } catch (e) {
            localStorage.removeItem('deliveryPerson');
          }
        }
        setIsLoading(false);
        return;
      }
    } catch (error) {
      // Not logged in as admin, continue with delivery login check
    }

    const savedDeliveryPerson = localStorage.getItem('deliveryPerson');
    if (savedDeliveryPerson) {
      try {
        const person = JSON.parse(savedDeliveryPerson);
        setDeliveryPerson(person);
        await Promise.all([
          loadAssignedOrders(person.id),
          loadAvailableOrders()
        ]);
      } catch (e) {
        localStorage.removeItem('deliveryPerson');
      }
    }
    setIsLoading(false);
  }, [loadAssignedOrders, loadAvailableOrders]);

  useEffect(() => {
    checkDeliveryLogin();
  }, [checkDeliveryLogin]);

  useEffect(() => {
    // Auto-request notification permission when delivery person logs in
    if (deliveryPerson) {
      checkNotificationStatus();
      requestNotificationPermission();
    }
  }, [deliveryPerson]);

  const checkNotificationStatus = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
        
        if (permission === 'granted') {
          // Show a test notification
          showBrowserNotification(
            '🔔 Notifications Enabled!',
            'You will now receive alerts for new orders.'
          );
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const showBrowserNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg',
          badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6885ba54fc40d82179646aca/56f3d15ef_WhatsAppImage2025-12-13at111830AM.jpeg',
          tag: 'new-order',
          requireInteraction: true
        });

        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(err => console.log('Could not play sound'));

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  useEffect(() => {
    let intervalId;
    if (deliveryPerson) {
      // Poll for new orders every 5 seconds
      intervalId = setInterval(() => {
        loadAssignedOrders(deliveryPerson.id);
        loadAvailableOrders();
      }, 5000);
    }
    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [deliveryPerson?.id]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      // Get all delivery persons and find matching email
      const allDeliveryPersons = await DeliveryPerson.list();
      
      const deliveryPerson = allDeliveryPersons.find(person => 
        person.email && person.email.toLowerCase().trim() === loginForm.email.toLowerCase().trim()
      );

      if (!deliveryPerson) {
        setLoginError("No delivery person found with this email");
        setIsLoggingIn(false);
        return;
      }

      // Check password
      const storedPassword = String(deliveryPerson.password || '').trim();
      const enteredPassword = String(loginForm.password || '').trim();
      
      if (storedPassword !== enteredPassword) {
        setLoginError(`Incorrect password. Please check your password and try again.`);
        setIsLoggingIn(false);
        return;
      }

      // Check if delivery person is blocked
      if (deliveryPerson.is_blocked) {
        setLoginError("Your account has been blocked by the administrator. Please contact support.");
        setIsLoggingIn(false);
        return;
      }

      // Check if delivery person is active
      if (deliveryPerson.hasOwnProperty('is_available') && !deliveryPerson.is_available) {
        setLoginError("Your account is currently inactive. Please contact admin.");
        setIsLoggingIn(false);
        return;
      }

      // Successful login
      localStorage.setItem('deliveryPerson', JSON.stringify(deliveryPerson));
      setDeliveryPerson(deliveryPerson);
      await Promise.all([
        loadAssignedOrders(deliveryPerson.id),
        loadAvailableOrders()
      ]);
      
      // Request notification permission immediately after login
      requestNotificationPermission();
      
      // Clear form
      setLoginForm({ email: "", password: "" });
      setLoginError("");
      
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Login failed. Please check your connection and try again.");
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('deliveryPerson');
    setDeliveryPerson(null);
    setAssignedOrders([]);
    setAvailableOrders([]);
  };

  const toggleAvailability = async () => {
    setIsTogglingAvailability(true);
    try {
      const newAvailability = !deliveryPerson.is_available;
      await DeliveryPerson.update(deliveryPerson.id, {
        is_available: newAvailability
      });

      // Update local state
      const updatedPerson = { ...deliveryPerson, is_available: newAvailability };
      setDeliveryPerson(updatedPerson);
      localStorage.setItem('deliveryPerson', JSON.stringify(updatedPerson));

      // Show notification about status change
      if (newAvailability) {
        showBrowserNotification(
          '✅ You are now ONLINE',
          'You will receive notifications for new orders'
        );
      } else {
        showBrowserNotification(
          '⏸️ You are now OFFLINE',
          'You will not receive new order notifications'
        );
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
    setIsTogglingAvailability(false);
  };

  const acceptOrder = async (orderId) => {
    setAcceptingOrderId(orderId);
    try {
      await Order.update(orderId, {
        delivery_person_id: deliveryPerson.id,
        status: "preparing"
      });

      // Update delivery person's current orders
      const updatedOrders = [...(deliveryPerson.current_orders || []), orderId];
      await DeliveryPerson.update(deliveryPerson.id, {
        current_orders: updatedOrders
      });

      // Send notification to admin
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role === 'admin') {
          await base44.entities.Notification.create({
            user_id: currentUser.id,
            title: "Order Accepted by Delivery Partner",
            message: `${deliveryPerson.name} has accepted order #${availableOrders.find(o => o.id === orderId)?.order_number}`,
            type: "info"
          });
        }
      } catch (notifError) {
        console.error("Error sending admin notification:", notifError);
      }

      // Reload orders
      await Promise.all([
        loadAssignedOrders(deliveryPerson.id),
        loadAvailableOrders()
      ]);

    } catch (error) {
      console.error("Error accepting order:", error);
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const markOutForDelivery = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await Order.update(orderId, { status: "out_for_delivery" });

      const order = assignedOrders.find(o => o.id === orderId);
      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Out for Delivery!",
          message: `Your order #${order.order_number} is on its way!`,
          type: "info"
        });
      }

      await loadAssignedOrders(deliveryPerson.id);
    } catch (error) {
      console.error("Error marking order out for delivery:", error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markOrderDelivered = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await Order.update(orderId, { status: "delivered" });

      const order = assignedOrders.find(o => o.id === orderId);
      if (order) {
        // Update performance record with delivery time
        try {
          const performanceRecords = await base44.entities.DeliveryPerformance.filter({
            order_id: orderId,
            delivery_person_id: deliveryPerson.id
          });
          
          if (performanceRecords[0]) {
            const pickupTime = new Date(performanceRecords[0].pickup_time);
            const deliveryTime = new Date();
            const durationMinutes = Math.round((deliveryTime - pickupTime) / (1000 * 60));
            
            await base44.entities.DeliveryPerformance.update(performanceRecords[0].id, {
              delivery_time: deliveryTime.toISOString(),
              duration_minutes: durationMinutes,
              order_value: order.total_amount
            });
          }
        } catch (perfError) {
          console.error("Error updating performance:", perfError);
        }

        await Notification.create({
          user_id: order.user_id,
          title: "Order Delivered!",
          message: `Your order #${order.order_number} has been delivered. Thank you for choosing CollegeCart!`,
          type: "success"
        });

        // Send delivery confirmation email
        try {
          const user = await base44.entities.User.filter({ id: order.user_id });
          if (user[0]?.email) {
            await base44.integrations.Core.SendEmail({
              from_name: "CollegeCart",
              to: user[0].email,
              subject: `Order ${order.order_number} - Delivered Successfully! 🎉`,
              body: `
                <h2>Order Delivered!</h2>
                <p>Hi ${order.customer_name},</p>
                <p>Your order <strong>#${order.order_number}</strong> has been successfully delivered!</p>
                <p>Order Total: ₹${order.total_amount.toFixed(2)}</p>
                <p>We hope you enjoy your items! 🎉</p>
                <br/>
                <p>Thank you for choosing CollegeCart. We look forward to serving you again!</p>
                <br/>
                <p>Best regards,<br/>CollegeCart Team</p>
              `
            });
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }

        // Award loyalty points
        try {
          await base44.functions.invoke('awardLoyaltyPoints', { orderId: orderId });
        } catch (error) {
          console.error("Error awarding loyalty points:", error);
        }
      }

      if (deliveryPerson) {
        // Calculate 10% commission from the order total
        const commission = order.total_amount * 0.10;
        const newTotalDeliveries = (deliveryPerson.total_deliveries || 0) + 1;
        const newTotalEarnings = (deliveryPerson.total_earnings || 0) + commission;

        await DeliveryPerson.update(deliveryPerson.id, {
          total_deliveries: newTotalDeliveries,
          total_earnings: newTotalEarnings,
          current_orders: (deliveryPerson.current_orders || []).filter(id => id !== orderId)
        });

        // Update local state
        setDeliveryPerson(prev => ({
          ...prev,
          total_deliveries: newTotalDeliveries,
          total_earnings: newTotalEarnings
        }));

        // Refresh orders locally for immediate UI update
        setAssignedOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      }

    } catch (error) {
      console.error("Error marking order as delivered:", error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelClick = (order) => {
    setOrderToCancel(order);
    setShowCancelDialog(true);
  };

  const cancelOrder = async () => {
    if (!orderToCancel) return;

    const orderId = orderToCancel.id;
    setShowCancelDialog(false);
    setCancellingOrderId(orderId);
    try {
      await Order.update(orderId, { 
        status: "cancelled",
        delivery_person_id: null
      });

      const order = assignedOrders.find(o => o.id === orderId);
      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Cancelled",
          message: `Your order #${order.order_number} has been cancelled by the delivery partner. You will be contacted shortly.`,
          type: "error"
        });
      }

      if (deliveryPerson) {
        await DeliveryPerson.update(deliveryPerson.id, {
          current_orders: (deliveryPerson.current_orders || []).filter(id => id !== orderId)
        });

        setAssignedOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      }

      await loadAvailableOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setCancellingOrderId(null);
      setOrderToCancel(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!deliveryPerson) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Delivery Partner Login Required</CardTitle>
            <p className="text-gray-600">This page is only accessible to registered delivery partners</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Real-time Notifications */}
      <DeliveryNotifications deliveryPersonEmail={deliveryPerson.email} />

      {/* Browser Notification Prompt */}
      {!notificationsEnabled && 'Notification' in window && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Enable Browser Notifications</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Get instant alerts for new orders even when this tab is not in focus or minimized.
                {Notification.permission === 'denied' && (
                  <span className="block mt-1 font-medium">
                    ⚠️ Notifications are blocked. Please enable them in your browser settings.
                  </span>
                )}
              </p>
              <Button
                onClick={requestNotificationPermission}
                size="sm"
                className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Bell className="w-4 h-4 mr-2" />
                {Notification.permission === 'denied' ? 'Check Browser Settings' : 'Enable Notifications'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-600">Welcome back, {deliveryPerson.name}!</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={deliveryPerson.is_available ? "default" : "outline"}
            onClick={toggleAvailability}
            disabled={isTogglingAvailability}
            className={deliveryPerson.is_available ? "bg-green-600 hover:bg-green-700" : "border-red-500 text-red-600 hover:bg-red-50"}
          >
            {isTogglingAvailability ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Power className="w-4 h-4 mr-2" />
            )}
            {deliveryPerson.is_available ? "Available" : "Offline"}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Availability Status Banner */}
      {!deliveryPerson.is_available && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">You are currently OFFLINE</h3>
              <p className="text-sm text-orange-700 mt-1">
                You will not receive notifications for new orders. Toggle the availability button to go online.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Delivery Statistics */}
      <DeliveryStats deliveryPerson={deliveryPerson} />

      {/* Live Location Tracking */}
      <LiveLocationTracker 
        deliveryPersonId={deliveryPerson.id}
        orderId={assignedOrders.find(o => o.status === 'out_for_delivery')?.id}
      />

      {/* AI Delivery Assistant */}
      <DeliveryAI deliveryPerson={deliveryPerson} orders={assignedOrders} />

      {/* Available Orders to Accept - Only show if available */}
      {deliveryPerson.is_available && availableOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Available Orders</h2>
            <Badge className="bg-blue-100 text-blue-800">{availableOrders.length} new</Badge>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {availableOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge className="bg-blue-500 text-white">
                              NEW ORDER
                            </Badge>
                            {order.is_paid && (
                              <Badge className="bg-green-100 text-green-800">
                                ✓ PAID
                              </Badge>
                            )}
                            {!order.is_paid && order.payment_method === "cash" && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                COD
                              </Badge>
                            )}
                            <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-start gap-3">
                              <User className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Customer Name</p>
                                <p className="text-gray-600">{order.customer_name}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Delivery Address</p>
                                <p className="text-gray-600">{order.delivery_address}</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-xl font-bold text-emerald-600">
                              ₹{order.total_amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">Your commission: ₹{(order.total_amount * 0.10).toFixed(2)}</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => acceptOrder(order.id)}
                          disabled={acceptingOrderId === order.id}
                          className="bg-blue-600 hover:bg-blue-700 w-full lg:w-auto"
                        >
                          {acceptingOrderId === order.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept Order
                            </>
                          )}
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

      {/* Orders to Deliver */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Active Deliveries</h2>
        
        {assignedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders assigned</h3>
              <p className="text-gray-600">You'll see new orders here automatically.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {assignedOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {order.status === "preparing" ? (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Package className="w-4 h-4 mr-1" />
                                PREPARING
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Truck className="w-4 h-4 mr-1" />
                                OUT FOR DELIVERY
                              </Badge>
                            )}
                            {order.is_paid && (
                              <Badge className="bg-green-100 text-green-800">
                                ✓ PAID
                              </Badge>
                            )}
                            {!order.is_paid && order.payment_method === "cash" && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                COD
                              </Badge>
                            )}
                            <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-start gap-3">
                              <User className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Customer Name</p>
                                <p className="text-gray-600">{order.customer_name}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Delivery Address</p>
                                <p className="text-gray-600">{order.delivery_address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Customer Phone</p>
                                <p className="text-gray-600">{order.phone_number}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="font-medium text-gray-900 mb-2">Order Items</p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                              {order.items?.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {item.product_name} <span className="text-gray-600">× {item.quantity}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total Amount</p>
                              <p className="text-xl font-bold text-emerald-600">
                                ₹{order.total_amount.toFixed(2)}
                              </p>
                            </div>
                            {order.delivery_notes && (
                              <div className="max-w-xs">
                                <p className="text-sm text-gray-600">Delivery Notes:</p>
                                <p className="text-sm font-medium">{order.delivery_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full lg:w-auto">
                          {order.status === "preparing" ? (
                            <Button
                              onClick={() => markOutForDelivery(order.id)}
                              disabled={updatingOrderId === order.id}
                              className="bg-orange-600 hover:bg-orange-700 w-full lg:w-auto"
                            >
                              {updatingOrderId === order.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Truck className="w-4 h-4 mr-2" />
                              )}
                              Out for Delivery
                            </Button>
                          ) : (
                            <>
                              <CODQRGenerator order={order} />
                              {/* Mobile: Swipe to Deliver */}
                              <div className="w-full lg:hidden">
                                <SwipeToDeliver
                                  onDeliver={() => markOrderDelivered(order.id)}
                                  isLoading={updatingOrderId === order.id}
                                />
                              </div>
                              {/* Desktop: Button */}
                              <Button
                                onClick={() => markOrderDelivered(order.id)}
                                disabled={updatingOrderId === order.id}
                                className="hidden lg:flex bg-green-600 hover:bg-green-700 w-full lg:w-auto"
                              >
                                {updatingOrderId === order.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Mark as Delivered
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => window.open(`tel:${order.phone_number}`)}
                            className="w-full lg:w-auto"
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Customer
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleCancelClick(order)}
                            disabled={cancellingOrderId === order.id}
                            className="w-full lg:w-auto"
                          >
                            {cancellingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            Cancel Order
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

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">Cancel Order?</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to cancel this order?
              {orderToCancel && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-900">Order #{orderToCancel.order_number}</p>
                  <p className="text-sm text-gray-600 mt-1">{orderToCancel.customer_name}</p>
                  <p className="text-sm text-gray-600">{orderToCancel.delivery_address}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setOrderToCancel(null);
              }}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={cancelOrder}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}