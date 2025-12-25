import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Package, Clock, Truck, CheckCircle, XCircle, User as UserIcon, Trash2, RefreshCw, DollarSign, Search, Filter, FileText, FileSpreadsheet, AlertCircle, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import DeliveryMap from "../delivery/DeliveryMap";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

function AdminOrderItem({ item }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const prods = await base44.entities.Product.filter({ id: item.product_id });
        setProduct(prods[0] || null);
      } catch (error) {
        console.error("Error loading product:", error);
      }
    };
    loadProduct();
  }, [item.product_id]);

  return (
    <div>
      • {item.product_name} x{item.quantity}
      {item.dhaba_name && (
        <span className="ml-1 text-amber-600 font-medium">
          (from {item.dhaba_name})
        </span>
      )}
      {product?.source_dhaba && (
        <span className="ml-1 text-blue-600 text-xs">
          [📍 {product.source_dhaba}]
        </span>
      )}
    </div>
  );
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hostelFilter, setHostelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMap, setShowMap] = useState(false);

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
    // Update UI immediately (optimistic update)
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: newStatus, delivery_person_id: deliveryPersonId || o.delivery_person_id } : o
    ));

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

        // Send email notification
        try {
          const user = await base44.entities.User.filter({ id: order.user_id });
          if (user[0]?.email) {
            await base44.integrations.Core.SendEmail({
              from_name: "CollegeCart",
              to: user[0].email,
              subject: `Order ${order.order_number} - Status Update`,
              body: `
                <h2>Order Status Updated</h2>
                <p>Hi ${order.customer_name},</p>
                <p>Your order <strong>#${order.order_number}</strong> status has been updated to: <strong>${newStatus.replace(/_/g, ' ').toUpperCase()}</strong></p>
                <p>Order Total: ₹${order.total_amount.toFixed(2)}</p>
                <p>Delivery Address: ${order.delivery_address}</p>
                ${newStatus === 'out_for_delivery' ? '<p><strong>Your order is on its way! 🚚</strong></p>' : ''}
                ${newStatus === 'delivered' ? '<p><strong>Thank you for choosing CollegeCart! 🎉</strong></p>' : ''}
                <br/>
                <p>Best regards,<br/>CollegeCart Team</p>
              `
            });
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
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

      // Refresh data in background
      loadData();
    } catch (error) {
      console.error("Error updating order status:", error);
      // Revert optimistic update on error
      loadData();
      
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
    // Update UI immediately (optimistic update)
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, delivery_person_id: deliveryPersonId, status: "out_for_delivery" } : o
    ));

    try {
      await Order.update(orderId, {
        delivery_person_id: deliveryPersonId,
        status: "out_for_delivery"
      });

      // Track pickup time for performance
      await base44.entities.DeliveryPerformance.create({
        delivery_person_id: deliveryPersonId,
        order_id: orderId,
        pickup_time: new Date().toISOString()
      });

      // Update delivery person's current orders
      const deliveryPerson = deliveryPersons.find(p => p.id === deliveryPersonId);
      if (deliveryPerson) {
        const currentOrders = deliveryPerson.current_orders || [];
        await DeliveryPerson.update(deliveryPersonId, {
          current_orders: [...currentOrders, orderId]
        });

        // Send push notification to delivery person
        await Notification.create({
          user_id: deliveryPerson.email,
          title: "New Order Assigned! 📦",
          message: `Order #${orders.find(o => o.id === orderId)?.order_number} has been assigned to you`,
          type: "info"
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

        // Send email
        try {
          const user = await base44.entities.User.filter({ id: order.user_id });
          if (user[0]?.email) {
            await base44.integrations.Core.SendEmail({
              from_name: "CollegeCart",
              to: user[0].email,
              subject: `Order ${order.order_number} - Out for Delivery! 🚚`,
              body: `
                <h2>Your Order is On Its Way!</h2>
                <p>Hi ${order.customer_name},</p>
                <p>Great news! Your order <strong>#${order.order_number}</strong> is now out for delivery.</p>
                <p>Delivery Address: ${order.delivery_address}</p>
                <p>Contact: ${order.phone_number}</p>
                <p>Expected delivery: Within 30-40 minutes</p>
                <br/>
                <p>Thank you for choosing CollegeCart!</p>
              `
            });
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
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

      // Refresh data in background
      loadData();
    } catch (error) {
      console.error("Error assigning delivery person:", error);
      // Revert optimistic update on error
      loadData();
      
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
      cancelled: XCircle,
      refunded: DollarSign
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
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-purple-100 text-purple-800"
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const getDeliveryPersonName = (deliveryPersonId) => {
    const person = deliveryPersons.find(p => p.id === deliveryPersonId);
    return person ? person.name : "Not assigned";
  };

  const cancelOrder = async (orderId) => {
    // Update UI immediately (optimistic update)
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: "cancelled" } : o
    ));

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

      // Refresh data in background
      loadData();
    } catch (error) {
      console.error("Error cancelling order:", error);
      // Revert optimistic update on error
      loadData();
    }
  };

  const deleteOrder = async (orderId) => {
    // Update UI immediately (optimistic update)
    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      await Order.delete(orderId);
      // Refresh data in background
      loadData();
    } catch (error) {
      console.error("Error deleting order:", error);
      // Revert optimistic update on error
      loadData();
    }
  };

  const refundOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to process refund for this order?")) {
      return;
    }

    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Update UI immediately (optimistic update)
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: "refunded" } : o
      ));

      // Update order status to refunded
      await Order.update(orderId, { status: "refunded" });

      // Create refund record
      await base44.entities.Refund.create({
        order_id: orderId,
        user_id: order.user_id,
        reason: "Admin initiated refund",
        amount: order.total_amount,
        status: "processed"
      });

      // Notify customer about refund
      await Notification.create({
        user_id: order.user_id,
        title: "Refund Processed",
        message: `Refund of ₹${order.total_amount.toFixed(2)} has been processed for order ${order.order_number}. Amount will be credited within 5-7 business days.`,
        type: "success"
      });

      // Notify admin
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Refund Successful",
          message: `Refund of ₹${order.total_amount.toFixed(2)} processed for order ${order.order_number}`,
          type: "success"
        });
      } catch (err) {
        console.error("Error creating admin notification:", err);
      }

      // Refresh data in background
      loadData();
    } catch (error) {
      console.error("Error processing refund:", error);
      // Revert optimistic update on error
      loadData();
      
      // Show error notification to admin
      try {
        const currentUser = await User.me();
        await Notification.create({
          user_id: currentUser.id,
          title: "Refund Failed",
          message: "Failed to process refund. Please try again.",
          type: "error"
        });
      } catch (err) {
        console.error("Error creating admin error notification:", err);
      }
    }
  };

  const exportToPDF = (ordersList, fileName) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Orders Report', 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Orders: ${ordersList.length}`, 20, 35);
    
    let y = 50;
    ordersList.forEach((order, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Order #${order.order_number}`, 20, y);
      y += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Customer: ${order.customer_name}`, 20, y);
      y += 5;
      doc.text(`Address: ${order.delivery_address}`, 20, y);
      y += 5;
      doc.text(`Status: ${order.status}`, 20, y);
      y += 5;
      doc.text(`Amount: ₹${order.total_amount.toFixed(2)}`, 20, y);
      y += 5;
      doc.text(`Date: ${new Date(order.created_date).toLocaleString()}`, 20, y);
      y += 10;
    });
    
    doc.save(`${fileName}.pdf`);
  };

  const exportToExcel = (ordersList, fileName) => {
    const data = ordersList.map(order => ({
      'Order Number': order.order_number,
      'Customer Name': order.customer_name,
      'Delivery Address': order.delivery_address,
      'Phone': order.phone_number,
      'Status': order.status,
      'Total Amount': order.total_amount,
      'Payment Method': order.payment_method || 'N/A',
      'Items Count': order.items?.length || 0,
      'Order Date': new Date(order.created_date).toLocaleString(),
      'Items': order.items?.map(item => `${item.product_name} x${item.quantity}`).join(', ') || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesHostel = hostelFilter === "all" || 
      order.delivery_address.toLowerCase().includes(hostelFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesHostel && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Live Delivery Map - Collapsible */}
      <Collapsible open={showMap} onOpenChange={setShowMap}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-lg">Live Delivery Tracking</h3>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showMap ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <DeliveryMap showAllDeliveryPersons={true} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-gray-600">Track and manage customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(filteredOrders, 'admin-orders-report')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(filteredOrders, 'admin-orders-report')}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Search and Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order #, name, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={hostelFilter} onValueChange={setHostelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by hostel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hostels</SelectItem>
                  <SelectItem value="Mithali">Mithali Hostel</SelectItem>
                  <SelectItem value="Gavaskar">Gavaskar Hostel</SelectItem>
                  <SelectItem value="Virat">Virat Hostel</SelectItem>
                  <SelectItem value="Tendulkar">Tendulkar Hostel</SelectItem>
                  <SelectItem value="Other">Other Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
              {filteredOrders.map((order) => {
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
                        {order.status === "cancelled" && order.cancellation_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <p className="font-semibold text-red-900 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Cancelled
                            </p>
                            <p className="text-red-700 mt-1">{order.cancellation_reason}</p>
                            {order.cancelled_by && (
                              <p className="text-red-600 mt-1">By: {order.cancelled_by}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium mb-1">{order.items?.length || 0} items</p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {order.items?.map((item, idx) => (
                            <AdminOrderItem key={idx} item={item} />
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

                        {(order.status === "delivered" || order.status === "cancelled") && order.status !== "refunded" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => refundOrder(order.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Refund
                          </Button>
                        )}

                        {(order.status === "delivered" || order.status === "cancelled" || order.status === "refunded") && (
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