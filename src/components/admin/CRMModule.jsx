import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, MessageSquare, Award, Users, TrendingUp, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CRMModule() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerLoyalty, setCustomerLoyalty] = useState([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "", segment: "all" });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({});

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      const users = await base44.entities.User.list();
      const orders = await base44.entities.Order.list();
      const loyaltyTransactions = await base44.entities.LoyaltyTransaction.list();

      const customersWithStats = users
        .filter(u => u.role !== 'admin')
        .map(user => {
          const userOrders = orders.filter(o => o.user_id === user.id);
          const userLoyalty = loyaltyTransactions.filter(t => t.user_id === user.id);
          const totalSpent = userOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          const loyaltyBalance = userLoyalty.reduce((sum, t) => sum + t.points, 0);
          
          return {
            ...user,
            totalOrders: userOrders.length,
            totalSpent,
            loyaltyPoints: loyaltyBalance,
            lastOrderDate: userOrders.length > 0 ? new Date(Math.max(...userOrders.map(o => new Date(o.created_date)))).toLocaleDateString() : 'Never',
            segment: totalSpent > 2000 ? 'VIP' : totalSpent > 1000 ? 'Regular' : 'New'
          };
        });

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(c => 
      c.full_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone_number?.includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const loadCustomerDetails = async (customer) => {
    try {
      const [orders, loyalty] = await Promise.all([
        base44.entities.Order.filter({ user_id: customer.id }),
        base44.entities.LoyaltyTransaction.filter({ user_id: customer.id })
      ]);
      setCustomerOrders(orders);
      setCustomerLoyalty(loyalty);
      setSelectedCustomer(customer);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Error loading customer details:", error);
    }
  };

  const sendTargetedMessage = async () => {
    try {
      let recipients = [];
      
      if (messageData.segment === 'all') {
        recipients = customers;
      } else if (messageData.segment === 'selected') {
        recipients = customers.filter(c => selectedCustomers.includes(c.id));
      } else {
        recipients = customers.filter(c => c.segment === messageData.segment);
      }

      for (const customer of recipients) {
        if (customer.notification_preferences?.promotions !== false) {
          await base44.entities.Notification.create({
            user_id: customer.id,
            title: messageData.title,
            message: messageData.message,
            type: "info"
          });
        }
      }

      alert(`Message sent to ${recipients.length} customers!`);
      setShowMessageDialog(false);
      setMessageData({ title: "", message: "", segment: "all" });
      setSelectedCustomers([]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const toggleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const segments = {
    VIP: customers.filter(c => c.segment === 'VIP').length,
    Regular: customers.filter(c => c.segment === 'Regular').length,
    New: customers.filter(c => c.segment === 'New').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Relationship Management</h2>
          <p className="text-gray-600">Manage customers and send targeted communications</p>
        </div>
        <Button onClick={() => setShowMessageDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Mail className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>

      {/* Segment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{segments.VIP}</p>
            <p className="text-xs text-gray-600">Spent over ₹2000</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Regular Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{segments.Regular}</p>
            <p className="text-xs text-gray-600">Spent ₹1000-2000</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              New Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{segments.New}</p>
            <p className="text-xs text-gray-600">Spent under ₹1000</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedCustomers.length > 0 && (
          <Badge variant="outline" className="px-3 py-2">
            {selectedCustomers.length} selected
          </Badge>
        )}
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedCustomers(checked ? filteredCustomers.map(c => c.id) : []);
                    }}
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={() => toggleSelectCustomer(customer.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{customer.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{customer.email}</p>
                      <p className="text-gray-500">{customer.phone_number || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      customer.segment === 'VIP' ? 'bg-yellow-600' :
                      customer.segment === 'Regular' ? 'bg-blue-600' : 'bg-green-600'
                    }>
                      {customer.segment}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.totalOrders}</TableCell>
                  <TableCell>₹{customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell>{customer.loyaltyPoints}</TableCell>
                  <TableCell className="text-sm">{customer.lastOrderDate}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => loadCustomerDetails(customer)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details: {selectedCustomer?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">Orders ({customerOrders.length})</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty History</TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="space-y-3">
                {customerOrders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Order #{order.order_number}</p>
                          <p className="text-sm text-gray-600">{new Date(order.created_date).toLocaleString()}</p>
                          <p className="text-sm mt-2">Items: {order.items?.length || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">₹{order.total_amount.toFixed(2)}</p>
                          <Badge>{order.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="loyalty" className="space-y-2">
                {customerLoyalty.map(transaction => (
                  <div key={transaction.id} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-gray-600">{new Date(transaction.created_date).toLocaleDateString()}</p>
                      </div>
                      <Badge className={transaction.points > 0 ? 'bg-green-600' : 'bg-red-600'}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Targeted Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Segment</Label>
              <Select value={messageData.segment} onValueChange={(value) => setMessageData({...messageData, segment: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="VIP">VIP Customers</SelectItem>
                  <SelectItem value="Regular">Regular Customers</SelectItem>
                  <SelectItem value="New">New Customers</SelectItem>
                  {selectedCustomers.length > 0 && (
                    <SelectItem value="selected">Selected Customers ({selectedCustomers.length})</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Title</Label>
              <Input value={messageData.title} onChange={(e) => setMessageData({...messageData, title: e.target.value})} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={messageData.message} onChange={(e) => setMessageData({...messageData, message: e.target.value})} rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancel</Button>
              <Button onClick={sendTargetedMessage} className="bg-emerald-600 hover:bg-emerald-700">Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}