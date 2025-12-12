import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Download, Calendar, TrendingUp, Users, ShoppingBag, Award, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CRMReports() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [orders, users, loyaltyTxns, campaigns, campaignUsage] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list(),
        base44.entities.LoyaltyTransaction.list(),
        base44.entities.Campaign.list(),
        base44.entities.CampaignUsage.list()
      ]);

      const customers = users.filter(u => u.role !== 'admin');

      // Apply date filtering
      let filteredOrders = orders;
      if (dateRange.from) {
        filteredOrders = filteredOrders.filter(o => 
          new Date(o.created_date) >= new Date(dateRange.from)
        );
      }
      if (dateRange.to) {
        filteredOrders = filteredOrders.filter(o => 
          new Date(o.created_date) <= new Date(dateRange.to)
        );
      }

      // Customer Segmentation Analysis
      const segmentData = {
        vip: { count: 0, revenue: 0, orders: 0 },
        gold: { count: 0, revenue: 0, orders: 0 },
        silver: { count: 0, revenue: 0, orders: 0 },
        bronze: { count: 0, revenue: 0, orders: 0 },
        new: { count: 0, revenue: 0, orders: 0 }
      };

      customers.forEach(customer => {
        const customerOrders = filteredOrders.filter(o => o.user_id === customer.id);
        const spending = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);
        
        let segment = 'new';
        if (spending >= 10000) segment = 'vip';
        else if (spending >= 5000) segment = 'gold';
        else if (spending >= 2000) segment = 'silver';
        else if (customerOrders.length > 0) segment = 'bronze';

        if (!segmentFilter || segmentFilter === 'all' || segment === segmentFilter) {
          segmentData[segment].count++;
          segmentData[segment].revenue += spending;
          segmentData[segment].orders += customerOrders.length;
        }
      });

      // Purchase Patterns by Day of Week
      const dayPatterns = {};
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      days.forEach(day => dayPatterns[day] = { orders: 0, revenue: 0 });
      
      filteredOrders.forEach(order => {
        const day = days[new Date(order.created_date).getDay()];
        dayPatterns[day].orders++;
        dayPatterns[day].revenue += order.total_amount;
      });

      // Monthly Trends
      const monthlyData = {};
      filteredOrders.forEach(order => {
        const month = new Date(order.created_date).toLocaleDateString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, orders: 0, revenue: 0, customers: new Set() };
        }
        monthlyData[month].orders++;
        monthlyData[month].revenue += order.total_amount;
        monthlyData[month].customers.add(order.user_id);
      });

      const monthlyTrends = Object.values(monthlyData).map(m => ({
        ...m,
        customers: m.customers.size
      }));

      // Loyalty Program Performance
      const loyaltyStats = {
        totalPointsIssued: loyaltyTxns.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0),
        totalPointsRedeemed: Math.abs(loyaltyTxns.filter(t => t.points < 0).reduce((sum, t) => sum + t.points, 0)),
        activeUsers: new Set(loyaltyTxns.map(t => t.user_id)).size
      };

      // Campaign Effectiveness
      const campaignStats = campaigns.map(camp => {
        const usage = campaignUsage.filter(u => u.campaign_id === camp.id);
        return {
          name: camp.name,
          usage: usage.length,
          revenue: usage.reduce((sum, u) => sum + u.order_amount, 0),
          discount: usage.reduce((sum, u) => sum + u.discount_amount, 0),
          roi: usage.length > 0 ? ((usage.reduce((sum, u) => sum + u.order_amount, 0) - usage.reduce((sum, u) => sum + u.discount_amount, 0)) / usage.reduce((sum, u) => sum + u.discount_amount, 0) * 100).toFixed(2) : 0
        };
      });

      // Top Products by Revenue
      const productRevenue = {};
      filteredOrders.forEach(order => {
        order.items?.forEach(item => {
          if (!productRevenue[item.product_name]) {
            productRevenue[item.product_name] = 0;
          }
          productRevenue[item.product_name] += item.price * item.quantity;
        });
      });

      const topProducts = Object.entries(productRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setReportData({
        segmentData: Object.entries(segmentData).map(([name, data]) => ({ name, ...data })),
        dayPatterns: Object.entries(dayPatterns).map(([day, data]) => ({ day, ...data })),
        monthlyTrends,
        loyaltyStats,
        campaignStats,
        topProducts,
        summary: {
          totalCustomers: customers.length,
          totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total_amount, 0),
          totalOrders: filteredOrders.length,
          avgOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, o) => sum + o.total_amount, 0) / filteredOrders.length : 0
        }
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    loadReportData();
  };

  const exportReport = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            CRM Reports & Analytics
          </h2>
          <p className="text-gray-600">Comprehensive customer and business insights</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <div>
              <Label>Customer Segment</Label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{reportData.summary.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{reportData.summary.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{reportData.summary.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">₹{reportData.summary.avgOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.segmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Purchase Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Patterns by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.dayPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#10b981" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue (₹)" />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty & Campaign Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Loyalty Program Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Total Points Issued</span>
              <span className="font-bold text-purple-600">{reportData.loyaltyStats.totalPointsIssued}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">Total Points Redeemed</span>
              <span className="font-bold text-red-600">{reportData.loyaltyStats.totalPointsRedeemed}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Active Loyalty Users</span>
              <span className="font-bold text-green-600">{reportData.loyaltyStats.activeUsers}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.campaignStats.slice(0, 5).map((camp, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{camp.name}</span>
                    <Badge className="bg-emerald-600">{camp.usage} uses</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-medium">₹{camp.revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Discount</p>
                      <p className="font-medium">₹{camp.discount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">ROI</p>
                      <p className="font-medium text-green-600">{camp.roi}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}