import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, DollarSign, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DailyProfitCalculator() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // Last 7 days
  const [profitData, setProfitData] = useState([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    avgProfitPerOrder: 0
  });

  useEffect(() => {
    loadProfitData();
  }, [dateRange]);

  const loadProfitData = async () => {
    setIsLoading(true);
    try {
      // Fetch orders from the last N days
      const orders = await base44.entities.Order.filter({
        status: "delivered"
      }, '-created_date', 1000);

      // Fetch all products to get profit margins
      const products = await base44.entities.Product.list('-created_date', 500);
      const productMap = {};
      products.forEach(p => {
        productMap[p.id] = p;
      });

      // Group orders by date
      const dailyData = {};
      let totalRevenue = 0;
      let totalProfit = 0;
      let totalOrderCount = 0;

      orders.forEach(order => {
        const orderDate = new Date(order.created_date);
        const today = new Date();
        const daysAgo = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo <= dateRange) {
          const dateKey = format(orderDate, 'yyyy-MM-dd');
          
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              date: dateKey,
              dateDisplay: format(orderDate, 'MMM dd'),
              revenue: 0,
              profit: 0,
              orders: 0,
              items: 0
            };
          }

          // Calculate revenue
          const revenue = order.total_amount || 0;
          dailyData[dateKey].revenue += revenue;
          totalRevenue += revenue;
          dailyData[dateKey].orders += 1;
          totalOrderCount += 1;

          // Calculate profit based on items
          let orderProfit = 0;
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const product = productMap[item.product_id];
              if (product) {
                const itemRevenue = item.price * item.quantity;
                const profitMargin = product.profit_margin || 20; // Default 20% if not set
                const itemProfit = (itemRevenue * profitMargin) / 100;
                orderProfit += itemProfit;
                dailyData[dateKey].items += item.quantity;
              }
            });
          }
          
          dailyData[dateKey].profit += orderProfit;
          totalProfit += orderProfit;
        }
      });

      // Convert to array and sort by date
      const dataArray = Object.values(dailyData).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      setProfitData(dataArray);
      setTotalStats({
        totalRevenue,
        totalProfit,
        totalOrders: totalOrderCount,
        avgProfitPerOrder: totalOrderCount > 0 ? totalProfit / totalOrderCount : 0
      });
    } catch (error) {
      console.error("Error loading profit data:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-gray-600 mt-4">Loading profit data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalStats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-emerald-600">₹{totalStats.totalProfit.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Profit/Order</p>
                <p className="text-2xl font-bold text-orange-600">₹{totalStats.avgProfitPerOrder.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profit Overview</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={dateRange === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(7)}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(30)}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(90)}
              >
                Last 90 Days
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profitData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No profit data available for selected period</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Line Chart for Revenue vs Profit */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Revenue vs Profit Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateDisplay" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart for Daily Orders */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Orders</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateDisplay" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#8b5cf6" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Orders</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Items Sold</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Profit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {profitData.map((day, index) => {
                  const marginPercent = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{day.dateDisplay}</td>
                      <td className="py-3 px-4 text-right">{day.orders}</td>
                      <td className="py-3 px-4 text-right">{day.items}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{day.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">₹{day.profit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                          {marginPercent.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}