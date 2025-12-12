import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingCart, Users, DollarSign, Package, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function EnhancedDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRange, setTimeRange] = useState("7days");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0
  });
  const [salesData, setSalesData] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      const [ordersData, productsData, usersData, categoriesData] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.Product.list(),
        base44.entities.User.list(),
        base44.entities.Category.list()
      ]);

      setOrders(ordersData);
      setProducts(productsData);
      setUsers(usersData);

      // Calculate stats
      const revenue = ordersData.reduce((sum, o) => sum + o.total_amount, 0);
      setStats({
        totalRevenue: revenue,
        totalOrders: ordersData.length,
        totalCustomers: usersData.filter(u => u.role !== 'admin').length,
        avgOrderValue: ordersData.length > 0 ? revenue / ordersData.length : 0
      });

      // Process sales data by date
      const salesByDate = {};
      ordersData.forEach(order => {
        const date = new Date(order.created_date).toLocaleDateString();
        if (!salesByDate[date]) {
          salesByDate[date] = { date, revenue: 0, orders: 0 };
        }
        salesByDate[date].revenue += order.total_amount;
        salesByDate[date].orders += 1;
      });
      setSalesData(Object.values(salesByDate).slice(-7));

      // Calculate popular products
      const productSales = {};
      ordersData.forEach(order => {
        order.items?.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = { 
              name: item.product_name, 
              quantity: 0, 
              revenue: 0 
            };
          }
          productSales[item.product_id].quantity += item.quantity;
          productSales[item.product_id].revenue += item.price * item.quantity;
        });
      });
      setPopularProducts(
        Object.values(productSales)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
      );

      // Category distribution
      const categoryMap = {};
      categoriesData.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });
      const categorySales = {};
      ordersData.forEach(order => {
        order.items?.forEach(item => {
          const product = productsData.find(p => p.id === item.product_id);
          if (product) {
            const catName = categoryMap[product.category_id] || "Other";
            if (!categorySales[catName]) {
              categorySales[catName] = 0;
            }
            categorySales[catName] += item.price * item.quantity;
          }
        });
      });
      setCategoryData(
        Object.entries(categorySales).map(([name, value]) => ({ name, value }))
      );
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your business performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{stats.avgOrderValue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue (₹)" />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Popular Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" fill="#10b981" name="Quantity Sold" />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}