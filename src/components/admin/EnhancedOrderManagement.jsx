import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Edit, Ban, RefreshCw, Truck, Calendar, Package, Tag, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateShippingLabel } from "@/functions/generateShippingLabel";
import { getTrackingInfo } from "@/functions/getTrackingInfo";

export default function EnhancedOrderManagement() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, order: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, order: null });
  const [refundDialog, setRefundDialog] = useState({ open: false, order: null, reason: "" });
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [shippingDialog, setShippingDialog] = useState({ open: false, order: null, courier: "Local Delivery" });
  const [trackingDialog, setTrackingDialog] = useState({ open: false, trackingInfo: null, loading: false });

  useEffect(() => {
    loadOrders();
    loadDeliveryPersons();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, orders]);

  const loadOrders = async () => {
    try {
      const data = await base44.entities.Order.list('-created_date');
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const loadDeliveryPersons = async () => {
    try {
      const persons = await base44.entities.DeliveryPerson.list();
      setDeliveryPersons(persons);
    } catch (error) {
      console.error("Error loading delivery persons:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query) ||
        o.phone_number?.includes(query) ||
        o.items?.some(item => item.product_name?.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(o => o.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(o => new Date(o.created_date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(o => new Date(o.created_date) <= endDate);
    }

    // Amount range filter
    if (filters.minAmount) {
      filtered = filtered.filter(o => o.total_amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(o => o.total_amount <= parseFloat(filters.maxAmount));
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await base44.entities.Order.update(orderId, { status: newStatus });
      loadOrders();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const updateOrderDetails = async () => {
    try {
      const { id, delivery_address, phone_number, delivery_notes, status, delivery_person_id } = editDialog.order;
      await base44.entities.Order.update(id, {
        delivery_address,
        phone_number,
        delivery_notes,
        status,
        delivery_person_id
      });
      
      await base44.entities.Notification.create({
        user_id: editDialog.order.user_id,
        title: "Order Updated",
        message: `Your order ${editDialog.order.order_number} has been updated`,
        type: "info"
      });

      setEditDialog({ open: false, order: null });
      loadOrders();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const cancelOrder = async () => {
    try {
      await base44.entities.Order.update(cancelDialog.order.id, { status: "cancelled" });
      
      await base44.entities.Notification.create({
        user_id: cancelDialog.order.user_id,
        title: "Order Cancelled",
        message: `Your order ${cancelDialog.order.order_number} has been cancelled`,
        type: "warning"
      });

      setCancelDialog({ open: false, order: null });
      loadOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const processRefund = async () => {
    try {
      await base44.entities.Order.update(refundDialog.order.id, { 
        status: "cancelled",
        refund_processed: true,
        refund_reason: refundDialog.reason
      });
      
      await base44.entities.Notification.create({
        user_id: refundDialog.order.user_id,
        title: "Refund Processed",
        message: `Refund of ₹${refundDialog.order.total_amount} for order ${refundDialog.order.order_number} has been initiated`,
        type: "success"
      });

      setRefundDialog({ open: false, order: null, reason: "" });
      loadOrders();
    } catch (error) {
      console.error("Error processing refund:", error);
    }
  };

  const generateLabel = async () => {
    try {
      const response = await generateShippingLabel({
        order_id: shippingDialog.order.id,
        courier_name: shippingDialog.courier
      });

      if (response.data.success) {
        alert(`Shipping label generated! Tracking: ${response.data.tracking_number}`);
        setShippingDialog({ open: false, order: null, courier: "Local Delivery" });
        loadOrders();
      }
    } catch (error) {
      console.error("Error generating label:", error);
      alert("Failed to generate shipping label");
    }
  };

  const viewTracking = async (order) => {
    if (!order.tracking_number) {
      alert("No tracking number available for this order");
      return;
    }

    setTrackingDialog({ open: true, trackingInfo: null, loading: true });

    try {
      const response = await getTrackingInfo({
        tracking_number: order.tracking_number
      });

      if (response.data.success) {
        setTrackingDialog({ open: true, trackingInfo: response.data.tracking_info, loading: false });
      }
    } catch (error) {
      console.error("Error fetching tracking:", error);
      setTrackingDialog({ open: false, trackingInfo: null, loading: false });
      alert("Failed to fetch tracking information");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: ""
    });
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order number, customer, phone, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-emerald-50" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date From</Label>
                  <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} />
                </div>
                <div>
                  <Label>Date To</Label>
                  <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} />
                </div>
                <div>
                  <Label>Min Amount (₹)</Label>
                  <Input type="number" value={filters.minAmount} onChange={(e) => setFilters({...filters, minAmount: e.target.value})} />
                </div>
                <div>
                  <Label>Max Amount (₹)</Label>
                  <Input type="number" value={filters.maxAmount} onChange={(e) => setFilters({...filters, maxAmount: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{order.customer_name}</p>
                      <p className="text-gray-500">{order.phone_number}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(order.created_date).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{order.items?.length || 0} items</TableCell>
                  <TableCell className="font-medium">₹{order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      {order.tracking_number && (
                        <div className="text-xs text-gray-600">
                          Track: {order.tracking_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setEditDialog({ open: true, order: {...order} })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setCancelDialog({ open: true, order })}
                          className="text-red-600"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                      {order.status === 'cancelled' && !order.refund_processed && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setRefundDialog({ open: true, order, reason: "" })}
                          className="text-orange-600"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      {!order.shipping_label_generated && order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setShippingDialog({ open: true, order, courier: "Local Delivery" })}
                          className="text-blue-600"
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      )}
                      {order.tracking_number && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => viewTracking(order)}
                          className="text-green-600"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Order Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order: {editDialog.order?.order_number}</DialogTitle>
          </DialogHeader>
          {editDialog.order && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editDialog.order.status}
                  onValueChange={(value) => setEditDialog({...editDialog, order: {...editDialog.order, status: value}})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Person</Label>
                <Select
                  value={editDialog.order.delivery_person_id || ""}
                  onValueChange={(value) => setEditDialog({...editDialog, order: {...editDialog.order, delivery_person_id: value}})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery person" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPersons.map(person => (
                      <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Address</Label>
                <Textarea
                  value={editDialog.order.delivery_address}
                  onChange={(e) => setEditDialog({...editDialog, order: {...editDialog.order, delivery_address: e.target.value}})}
                  rows={2}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={editDialog.order.phone_number}
                  onChange={(e) => setEditDialog({...editDialog, order: {...editDialog.order, phone_number: e.target.value}})}
                />
              </div>
              <div>
                <Label>Delivery Notes</Label>
                <Textarea
                  value={editDialog.order.delivery_notes || ""}
                  onChange={(e) => setEditDialog({...editDialog, order: {...editDialog.order, delivery_notes: e.target.value}})}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditDialog({ open: false, order: null })}>Cancel</Button>
                <Button onClick={updateOrderDetails} className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Are you sure you want to cancel order {cancelDialog.order?.order_number}? The customer will be notified.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, order: null })}>No, Keep Order</Button>
            <Button variant="destructive" onClick={cancelOrder}>Yes, Cancel Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ ...refundDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Process refund of ₹{refundDialog.order?.total_amount.toFixed(2)} for order {refundDialog.order?.order_number}
              </AlertDescription>
            </Alert>
            <div>
              <Label>Refund Reason</Label>
              <Textarea
                value={refundDialog.reason}
                onChange={(e) => setRefundDialog({...refundDialog, reason: e.target.value})}
                rows={3}
                placeholder="Enter reason for refund..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRefundDialog({ open: false, order: null, reason: "" })}>Cancel</Button>
              <Button onClick={processRefund} className="bg-orange-600 hover:bg-orange-700">Process Refund</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Shipping Label Dialog */}
      <Dialog open={shippingDialog.open} onOpenChange={(open) => setShippingDialog({ ...shippingDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Shipping Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Generate shipping label for order {shippingDialog.order?.order_number}
              </AlertDescription>
            </Alert>
            <div>
              <Label>Courier Service</Label>
              <Select
                value={shippingDialog.courier}
                onValueChange={(value) => setShippingDialog({...shippingDialog, courier: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local Delivery">Local Delivery</SelectItem>
                  <SelectItem value="Shiprocket">Shiprocket</SelectItem>
                  <SelectItem value="Delhivery">Delhivery</SelectItem>
                  <SelectItem value="Blue Dart">Blue Dart</SelectItem>
                  <SelectItem value="DTDC">DTDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                <strong>Order Details:</strong>
              </p>
              <p className="text-sm text-gray-700 mt-1">Customer: {shippingDialog.order?.customer_name}</p>
              <p className="text-sm text-gray-700">Address: {shippingDialog.order?.delivery_address}</p>
              <p className="text-sm text-gray-700">Phone: {shippingDialog.order?.phone_number}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShippingDialog({ open: false, order: null, courier: "Local Delivery" })}>Cancel</Button>
              <Button onClick={generateLabel} className="bg-blue-600 hover:bg-blue-700">
                <Tag className="w-4 h-4 mr-2" />
                Generate Label
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracking Info Dialog */}
      <Dialog open={trackingDialog.open} onOpenChange={(open) => setTrackingDialog({ ...trackingDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
          </DialogHeader>
          {trackingDialog.loading ? (
            <div className="text-center py-8">Loading tracking information...</div>
          ) : trackingDialog.trackingInfo ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tracking Number:</span>
                  <Badge className="font-mono">{trackingDialog.trackingInfo.tracking_number}</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Status:</span>
                  <Badge className="bg-blue-600">{trackingDialog.trackingInfo.status}</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{trackingDialog.trackingInfo.current_location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Est. Delivery:</span>
                  <span className="text-sm">{trackingDialog.trackingInfo.estimated_delivery}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Tracking History</h4>
                <div className="space-y-3">
                  {trackingDialog.trackingInfo.tracking_history?.map((event, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.status}</p>
                        <p className="text-xs text-gray-600">{event.location}</p>
                        <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}