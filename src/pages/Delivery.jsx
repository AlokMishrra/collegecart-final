import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { Truck, MapPin, Phone, Package, CheckCircle, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
  import DeliveryStats from "../components/delivery/DeliveryStats";
  import DeliveryNotifications from "../components/delivery/DeliveryNotifications";
  import CODQRGenerator from "../components/delivery/CODQRGenerator";

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

  const loadAssignedOrders = useCallback(async (deliveryPersonId) => {
    try {
      const orders = await Order.filter({
        delivery_person_id: deliveryPersonId,
        status: "out_for_delivery"
      });
      setAssignedOrders(orders);
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
      setAvailableOrders(unassignedOrders);
    } catch (error) {
      console.error("Error loading available orders:", error);
    }
  }, []);

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
    let intervalId;
    if (deliveryPerson) {
      // Poll for new orders every 5 seconds
      intervalId = setInterval(() => {
        loadAssignedOrders(deliveryPerson.id);
        loadAvailableOrders();
      }, 5000);
    }
    // Cleanup on unmount or when deliveryPerson changes
    return () => clearInterval(intervalId);
  }, [deliveryPerson, loadAssignedOrders, loadAvailableOrders]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      // Get all delivery persons and find matching email
      const allDeliveryPersons = await DeliveryPerson.list();
      
      // Debug: Log all delivery persons to see what's in the database
      console.log("All delivery persons:", allDeliveryPersons);
      console.log("Looking for email:", loginForm.email.toLowerCase().trim());
      
      const deliveryPerson = allDeliveryPersons.find(person => 
        person.email && person.email.toLowerCase().trim() === loginForm.email.toLowerCase().trim()
      );

      console.log("Found delivery person:", deliveryPerson);

      if (!deliveryPerson) {
        setLoginError("No delivery person found with this email");
        setIsLoggingIn(false);
        return;
      }

      // Debug: Log password comparison
      console.log("Stored password:", deliveryPerson.password);
      console.log("Entered password:", loginForm.password);
      console.log("Password match:", deliveryPerson.password === loginForm.password);

      // Check password - trim whitespace and compare
      const storedPassword = String(deliveryPerson.password || '').trim();
      const enteredPassword = String(loginForm.password || '').trim();
      
      if (storedPassword !== enteredPassword) {
        setLoginError(`Incorrect password. Please check your password and try again.`);
        setIsLoggingIn(false);
        return;
      }

      // Check if delivery person is active (if field exists)
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

  const acceptOrder = async (orderId) => {
    setAcceptingOrderId(orderId);
    try {
      await Order.update(orderId, {
        delivery_person_id: deliveryPerson.id,
        status: "out_for_delivery"
      });

      // Update delivery person's current orders
      const updatedOrders = [...(deliveryPerson.current_orders || []), orderId];
      await DeliveryPerson.update(deliveryPerson.id, {
        current_orders: updatedOrders
      });

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

  const markOrderDelivered = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await Order.update(orderId, { status: "delivered" });

      const order = assignedOrders.find(o => o.id === orderId);
      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Delivered!",
          message: `Your order #${order.order_number} has been delivered. Thank you for choosing CollegeCart!`,
          type: "success"
        });
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-600">Welcome back, {deliveryPerson.name}!</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Delivery Statistics */}
      <DeliveryStats deliveryPerson={deliveryPerson} />

      {/* Available Orders to Accept */}
      {availableOrders.length > 0 && (
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
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-500 text-white">
                              NEW ORDER
                            </Badge>
                            <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                              <div>
                                <p className="font-medium text-gray-900">Delivery Address</p>
                                <p className="text-gray-600">{order.delivery_address}</p>
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
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-orange-100 text-orange-800">
                              <Truck className="w-4 h-4 mr-1" />
                              OUT FOR DELIVERY
                            </Badge>
                            <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
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
                            <p className="font-medium text-gray-900 mb-2">Items ({order.items?.length || 0})</p>
                            <div className="space-y-1">
                              {order.items?.slice(0, 3).map((item, itemIndex) => (
                                <p key={itemIndex} className="text-sm text-gray-600">
                                  {item.product_name} x {item.quantity}
                                </p>
                              ))}
                              {order.items?.length > 3 && (
                                <p className="text-sm text-gray-500">
                                  +{order.items.length - 3} more items
                                </p>
                              )}
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
                          <CODQRGenerator order={order} />
                          <Button
                            onClick={() => markOrderDelivered(order.id)}
                            disabled={updatingOrderId === order.id}
                            className="bg-green-600 hover:bg-green-700 w-full lg:w-auto"
                          >
                            {updatingOrderId === order.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Mark as Delivered
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open(`tel:${order.phone_number}`)}
                            className="w-full lg:w-auto"
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Customer
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
    </div>
  );
}