import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, ShoppingCart, Award, Mail, Search, Filter, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CRMReports from "./CRMReports";

export default function CRMModule() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });
  const [segmentFilter, setSegmentFilter] = useState("all");

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      const [usersData, ordersData, loyaltyTxns] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Order.list(),
        base44.entities.LoyaltyTransaction.list()
      ]);

      setCustomers(usersData.filter(u => u.role !== 'admin'));
      setOrders(ordersData);

      // Process loyalty data
      const loyaltyMap = {};
      loyaltyTxns.forEach(txn => {
        if (!loyaltyMap[txn.user_id]) {
          loyaltyMap[txn.user_id] = { points: 0, transactions: [] };
        }
        loyaltyMap[txn.user_id].points += txn.points;
        loyaltyMap[txn.user_id].transactions.push(txn);
      });
      setLoyaltyData(loyaltyMap);
    } catch (error) {
      console.error("Error loading CRM data:", error);
    }
  };

  const getCustomerStats = (userId) => {
    const customerOrders = orders.filter(o => o.user_id === userId);
    const totalSpent = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = customerOrders.length > 0 ? totalSpent / customerOrders.length : 0;
    const loyaltyPoints = loyaltyData[userId]?.points || 0;

    return {
      totalOrders: customerOrders.length,
      totalSpent,
      avgOrderValue,
      loyaltyPoints,
      lastOrderDate: customerOrders.length > 0 ? new Date(customerOrders[0].created_date) : null
    };
  };

  const getCustomerSegment = (userId) => {
    const stats = getCustomerStats(userId);
    if (stats.totalSpent >= 10000) return { label: "VIP", color: "bg-purple-600" };
    if (stats.totalSpent >= 5000) return { label: "Gold", color: "bg-yellow-500" };
    if (stats.totalSpent >= 2000) return { label: "Silver", color: "bg-gray-400" };
    if (stats.totalOrders > 0) return { label: "Active", color: "bg-green-600" };
    return { label: "New", color: "bg-blue-600" };
  };

  const sendTargetedMessage = async () => {
    if (!messageData.title || !messageData.message) {
      alert("Please fill all fields");
      return;
    }

    try {
      const targetCustomers = filteredCustomers.filter(c => {
        if (segmentFilter === "all") return true;
        return getCustomerSegment(c.id).label.toLowerCase() === segmentFilter;
      });

      for (const customer of targetCustomers) {
        await base44.entities.Notification.create({
          user_id: customer.id,
          title: messageData.title,
          message: messageData.message,
          type: "info"
        });
      }

      alert(`Message sent to ${targetCustomers.length} customers`);
      setShowMessageDialog(false);
      setMessageData({ title: "", message: "" });
    } catch (error) {
      console.error("Error sending messages:", error);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const segment = getCustomerSegment(c.id);
    const matchesSegment = segmentFilter === "all" || segment.label.toLowerCase() === segmentFilter;
    return matchesSearch && matchesSegment;
  });

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Relationship Management</h2>
          <p className="text-gray-600">Manage customers, track behavior, and send targeted promotions</p>
        </div>
        <Button onClick={() => setShowMessageDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Mail className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>

      <TabsList>
        <TabsTrigger value="overview">Customer Overview</TabsTrigger>
        <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {customers.filter(c => getCustomerSegment(c.id).label === "VIP").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₹{orders.length > 0 ? (orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length).toFixed(2) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={segmentFilter === "all" ? "default" : "outline"}
            onClick={() => setSegmentFilter("all")}
          >
            All
          </Button>
          <Button
            variant={segmentFilter === "vip" ? "default" : "outline"}
            onClick={() => setSegmentFilter("vip")}
          >
            VIP
          </Button>
          <Button
            variant={segmentFilter === "gold" ? "default" : "outline"}
            onClick={() => setSegmentFilter("gold")}
          >
            Gold
          </Button>
          <Button
            variant={segmentFilter === "active" ? "default" : "outline"}
            onClick={() => setSegmentFilter("active")}
          >
            Active
          </Button>
        </div>
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map(customer => {
                const stats = getCustomerStats(customer.id);
                const segment = getCustomerSegment(customer.id);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.full_name || "N/A"}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={segment.color}>{segment.label}</Badge>
                    </TableCell>
                    <TableCell>{stats.totalOrders}</TableCell>
                    <TableCell>₹{stats.totalSpent.toFixed(2)}</TableCell>
                    <TableCell>{stats.loyaltyPoints}</TableCell>
                    <TableCell className="text-sm">
                      {stats.lastOrderDate ? stats.lastOrderDate.toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Targeted Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sending to: {filteredCustomers.length} customers ({segmentFilter === "all" ? "All segments" : segmentFilter})
            </p>
            <div>
              <Input
                placeholder="Message Title"
                value={messageData.title}
                onChange={(e) => setMessageData({...messageData, title: e.target.value})}
              />
            </div>
            <div>
              <Textarea
                placeholder="Message content..."
                value={messageData.message}
                onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancel</Button>
              <Button onClick={sendTargetedMessage} className="bg-emerald-600 hover:bg-emerald-700">
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedCustomer.full_name}</h3>
                <p className="text-gray-600">{selectedCustomer.email}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{getCustomerStats(selectedCustomer.id).totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold">₹{getCustomerStats(selectedCustomer.id).totalSpent.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Loyalty Points</p>
                    <p className="text-2xl font-bold">{getCustomerStats(selectedCustomer.id).loyaltyPoints}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Order History</h4>
                <div className="space-y-2">
                  {orders.filter(o => o.user_id === selectedCustomer.id).slice(0, 5).map(order => (
                    <div key={order.id} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                      <div>
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-sm text-gray-600">{new Date(order.created_date).toLocaleDateString()}</p>
                      </div>
                      <Badge className="h-fit">{order.status}</Badge>
                      <p className="font-semibold">₹{order.total_amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </TabsContent>

      <TabsContent value="reports">
        <CRMReports />
      </TabsContent>
    </Tabs>
  );
}