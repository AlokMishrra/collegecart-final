import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { Package, Clock, Truck, CheckCircle, XCircle, Edit, Plus, Search, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Product } from "@/entities/Product";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    delivery_address: "",
    delivery_notes: ""
  });
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundingOrder, setRefundingOrder] = useState(null);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    // Check URL for tab parameter
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, []);

  const loadOrders = useCallback(async (userId) => {
    setIsLoading(true);
    try {
      const userOrders = await Order.filter({ user_id: userId }, '-created_date');
      setOrders(userOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
    setIsLoading(false);
  }, []); // Dependencies are empty because it doesn't rely on any state/props that change during the component's lifecycle

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      loadOrders(currentUser.id);
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
  }, [navigate, loadOrders]); // Added navigate and loadOrders as dependencies

  useEffect(() => {
    checkUser();
  }, [checkUser]); // checkUser is now stable due to useCallback

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

  const canEditOrder = (order) => {
    return order.status !== "out_for_delivery" && order.status !== "delivered" && order.status !== "cancelled";
  };

  const canAddProducts = (order) => {
    return order.status === "preparing";
  };

  const loadProducts = async () => {
    try {
      const allProducts = await Product.filter({ is_available: true });
      setProducts(allProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleEditClick = (order) => {
    setEditingOrder(order);
    setEditForm({
      delivery_address: order.delivery_address,
      delivery_notes: order.delivery_notes || ""
    });
    setShowEditDialog(true);
  };

  const handleAddProductClick = (order) => {
    setEditingOrder(order);
    setSelectedProducts([]);
    setSearchQuery("");
    loadProducts();
    setShowAddProductDialog(true);
  };

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p)
    );
  };

  const handleAddProducts = async () => {
    if (selectedProducts.length === 0) return;

    try {
      const newItems = selectedProducts.map(p => ({
        product_id: p.id,
        product_name: p.name,
        price: p.price,
        quantity: p.quantity
      }));

      const updatedItems = [...editingOrder.items, ...newItems];
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      await Order.update(editingOrder.id, {
        items: updatedItems,
        total_amount: newTotal
      });

      await Notification.create({
        user_id: user.id,
        title: "Order Updated",
        message: `Added ${selectedProducts.length} product(s) to order ${editingOrder.order_number}`,
        type: "success"
      });

      setShowAddProductDialog(false);
      loadOrders(user.id);
    } catch (error) {
      console.error("Error adding products:", error);
      await Notification.create({
        user_id: user.id,
        title: "Update Failed",
        message: "Failed to add products. Please try again.",
        type: "error"
      });
    }
  };

  const handleRefundClick = (order) => {
    setRefundingOrder(order);
    setRefundReason("");
    setShowRefundDialog(true);
  };

  const handleSubmitRefund = async () => {
    if (!refundReason.trim()) {
      await Notification.create({
        user_id: user.id,
        title: "Refund Failed",
        message: "Please provide a reason for the refund",
        type: "error"
      });
      return;
    }

    try {
      await base44.entities.Refund.create({
        order_id: refundingOrder.id,
        user_id: user.id,
        reason: refundReason,
        amount: refundingOrder.total_amount,
        status: "pending"
      });

      await Notification.create({
        user_id: user.id,
        title: "Refund Requested",
        message: `Refund request submitted for order ${refundingOrder.order_number}. We'll review it soon.`,
        type: "success"
      });

      setShowRefundDialog(false);
      setRefundingOrder(null);
      setRefundReason("");
    } catch (error) {
      console.error("Error requesting refund:", error);
      await Notification.create({
        user_id: user.id,
        title: "Refund Failed",
        message: "Failed to submit refund request. Please try again.",
        type: "error"
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      await Order.update(editingOrder.id, editForm);
      
      await Notification.create({
        user_id: user.id,
        title: "Order Updated",
        message: `Your order ${editingOrder.order_number} has been updated successfully`,
        type: "success"
      });

      setShowEditDialog(false);
      loadOrders(user.id);
    } catch (error) {
      console.error("Error updating order:", error);
      await Notification.create({
        user_id: user.id,
        title: "Update Failed",
        message: "Failed to update order. Please try again.",
        type: "error"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Separate active and completed orders
  const activeOrders = orders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(order.status)
  );
  const completedOrders = orders.filter(order => 
    ['delivered', 'cancelled', 'refunded'].includes(order.status)
  );

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h2>
        <p className="text-gray-600 mb-8">Start shopping to see your orders here!</p>
        <button
          onClick={() => navigate(createPageUrl('Shop'))}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  const renderOrderCard = (order, index) => {
    const StatusIcon = getStatusIcon(order.status);
    
    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">Order {order.order_number}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Placed for <span className="font-medium">{order.customer_name}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(() => {
                          const date = new Date(order.created_date);
                          return date.toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          });
                        })()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(order.status)}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xl font-bold text-emerald-600">
                        ₹{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Items ({order.items.length})</h4>
                    <div className="space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center text-sm">
                          <span>{item.product_name} x {item.quantity}</span>
                          <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900">Delivery Address</h4>
                          <p className="text-gray-600 mt-1">{order.delivery_address}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Contact</h4>
                          <p className="text-gray-600 mt-1">{order.phone_number}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {canEditOrder(order) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(order)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {canAddProducts(order) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddProductClick(order)}
                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Items
                          </Button>
                        )}
                        {(order.status === "delivered" || order.status === "cancelled") && order.status !== "refunded" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundClick(order)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Request Refund
                          </Button>
                        )}
                        {order.status === "refunded" && (
                          <Badge className="bg-purple-100 text-purple-800">
                            Refunded
                          </Badge>
                        )}
                      </div>
                    </div>
                    {order.delivery_notes && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900">Delivery Notes</h4>
                        <p className="text-gray-600 mt-1">{order.delivery_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Package className="w-4 h-4" />
            Active Orders
            {activeOrders.length > 0 && (
              <Badge className="ml-1 bg-emerald-600">{activeOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Order History
            {completedOrders.length > 0 && (
              <Badge variant="outline" className="ml-1">{completedOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No active orders</h3>
                <p className="text-gray-600 mb-4">You don't have any orders in progress.</p>
                <Button
                  onClick={() => navigate(createPageUrl('Shop'))}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order, index) => renderOrderCard(order, index))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No order history</h3>
                <p className="text-gray-600">Your completed and cancelled orders will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order, index) => renderOrderCard(order, index))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_address">Delivery Address</Label>
              <Textarea
                id="edit_address"
                value={editForm.delivery_address}
                onChange={(e) => setEditForm({ ...editForm, delivery_address: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit_notes">Delivery Notes</Label>
              <Textarea
                id="edit_notes"
                value={editForm.delivery_notes}
                onChange={(e) => setEditForm({ ...editForm, delivery_notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Order: <span className="font-semibold">{refundingOrder?.order_number}</span>
              </p>
              <p className="text-sm text-gray-600">
                Amount: <span className="font-semibold text-emerald-600">₹{refundingOrder?.total_amount.toFixed(2)}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="refund_reason">Reason for Refund *</Label>
              <Textarea
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please explain why you're requesting a refund..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRefund} className="bg-orange-600 hover:bg-orange-700">
                Submit Refund Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Products Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Products to Order</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg p-2">
              <div className="space-y-2">
                {products
                  .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(product => {
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50 border-emerald-300' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleProductSelection(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">₹{product.price}</p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProductQuantity(product.id, isSelected.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center font-medium">{isSelected.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProductQuantity(product.id, isSelected.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Selected: {selectedProducts.length} product(s)
                </p>
                <p className="font-semibold">
                  Additional Cost: ₹{selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddProducts}
                disabled={selectedProducts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Add {selectedProducts.length > 0 && `(${selectedProducts.length})`} Products
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}