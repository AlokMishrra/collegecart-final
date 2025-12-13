import React, { useState, useEffect } from "react";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Package, Clock, Truck, CheckCircle, XCircle, User as UserIcon, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  useEffect(() => {
    loadData();
    
    // Poll for new orders every 5 seconds
    const interval = setInterval(() => {
      checkForNewOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = async (times = 3) => {
    for (let i = 0; i < times; i++) {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        await audio.play();
        // Wait for sound to finish before playing again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("Could not play notification sound");
      }
    }
  };

  const checkForNewOrders = async () => {
    try {
      const ordersData = await Order.list('-created_date');
      const pendingOrders = ordersData.filter(o => o.status === 'pending' || o.status === 'confirmed');
      
      if (lastOrderCount > 0 && pendingOrders.length > lastOrderCount) {
        // New order detected, play sound 3 times
        playNotificationSound(3);
      }
      
      setLastOrderCount(pendingOrders.length);
      setOrders(ordersData);
    } catch (error) {
      console.error("Error checking for new orders:", error);
    }
  };

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [ordersData, deliveryData] = await Promise.all([
        Order.list('-created_date'),
        DeliveryPerson.filter({ is_available: true })
      ]);
      setOrders(ordersData);
      setDeliveryPersons(deliveryData);
      
      // Initialize last order count
      const pendingOrders = ordersData.filter(o => o.status === 'pending' || o.status === 'confirmed');
      setLastOrderCount(pendingOrders.length);
    } catch (error) {
      console.error("Error loading data:", error);
      // Optional: Add a general admin notification for loading errors if needed
    }
    if (showRefreshing) {
      setIsRefreshing(false);
    } else {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, deliveryPersonId = null) => {
    try {
      const updateData = { status: newStatus };
      if (deliveryPersonId) {
        updateData.delivery_person_id = deliveryPersonId;
      }

      await Order.update(orderId, updateData);

      // Create notification for customer
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Status Updated",
          message: `Your order ${order.order_number} is now ${newStatus.replace(/_/g, ' ')}`,
          type: "info"
        });
      }

      // Show success notification to admin
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Status Updated",
          message: `Order ${order?.order_number || orderId} status changed to ${newStatus.replace(/_/g, ' ')}`,
          type: "success"
        });
      } catch (err) {
        console.error("Error creating admin success notification:", err);
      }

      loadData();
    } catch (error) {
      console.error("Error updating order status:", error);
      
      // Show error notification to admin if user is available
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Update Failed",
          message: "Failed to update order status. Please try again.",
          type: "error"
        });
      } catch (err) {
        console.error("Error creating admin error notification:", err);
      }
    }
  };

  const assignDeliveryPerson = async (orderId, deliveryPersonId) => {
    try {
      await Order.update(orderId, {
        delivery_person_id: deliveryPersonId,
        status: "out_for_delivery"
      });

      // Update delivery person's current orders
      const deliveryPerson = deliveryPersons.find(p => p.id === deliveryPersonId);
      if (deliveryPerson) {
        const currentOrders = deliveryPerson.current_orders || [];
        await DeliveryPerson.update(deliveryPersonId, {
          current_orders: [...currentOrders, orderId]
        });
      }

      // Create notification for customer
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Out for Delivery",
          message: `Your order ${order.order_number} is out for delivery!`,
          type: "info"
        });
      }

      // Show success notification to admin
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Delivery Assigned",
          message: `Order ${order?.order_number || orderId} has been assigned to ${deliveryPerson?.name || deliveryPersonId}`,
          type: "success"
        });
      } catch (err) {
        console.error("Error creating admin success notification:", err);
      }

      loadData();
    } catch (error) {
      console.error("Error assigning delivery person:", error);
      
      // Show error notification to admin
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Assignment Failed",
          message: "Failed to assign delivery person. Please try again.",
          type: "error"
        });
      } catch (err) {
        console.error("Error creating admin error notification:", err);
      }
    }
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      pending: Clock,
      confirmed: Package,
      preparing: Package,
      out_for_delivery: Truck,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    return iconMap[status] || Clock;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const getDeliveryPersonName = (deliveryPersonId) => {
    const person = deliveryPersons.find(p => p.id === deliveryPersonId);
    return person ? person.name : "Not assigned";
  };

  const cancelOrder = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      await Order.update(orderId, {
        status: "cancelled"
      });

      if (order) {
        await Notification.create({
          user_id: order.user_id,
          title: "Order Cancelled",
          message: `Your order #${order.order_number} has been cancelled`,
          type: "warning"
        });
      }

      loadData();
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await Order.delete(orderId);
      loadData();
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-gray-600">Track and manage customer orders</p>
        </div>
        <Button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Person</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium">{order.order_number}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.phone_number}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {order.delivery_address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium mb-1">{order.items?.length || 0} items</p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {order.items?.map((item, idx) => (
                            <div key={idx}>
                              • {item.product_name} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>₹{order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {(() => {
                              const date = new Date(order.created_date);
                              return date.toLocaleDateString('en-IN', { 
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              });
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              const date = new Date(order.created_date);
                              return date.toLocaleTimeString('en-IN', { 
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              });
                            })()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.delivery_person_id ? (
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {getDeliveryPersonName(order.delivery_person_id)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, "confirmed")}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Confirm
                          </Button>
                        )}
                        
                        {(order.status === "confirmed" || order.status === "preparing") && (
                          <>
                            {order.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, "preparing")}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Prepare
                              </Button>
                            )}
                            {!order.delivery_person_id && (
                              <Select onValueChange={(value) => assignDeliveryPerson(order.id, value)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {deliveryPersons.map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </>
                        )}
                        
                        {order.status === "out_for_delivery" && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, "delivered")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Delivered
                          </Button>
                        )}

                        {order.status !== "delivered" && order.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelOrder(order.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            Cancel
                          </Button>
                        )}

                        {(order.status === "delivered" || order.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}