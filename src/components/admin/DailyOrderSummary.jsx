import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Truck, DollarSign, TrendingUp, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DailyOrderSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: {},
    topDeliveryPersons: [],
    hourlyBreakdown: []
  });
  const [weeklySummary, setWeeklySummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: {},
    topDeliveryPersons: [],
    dailyBreakdown: []
  });

  const loadWeeklySummary = useCallback(async () => {
    try {
      const endOfWeek = new Date(selectedDate);
      endOfWeek.setHours(23, 59, 59, 999);
      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const allOrders = await Order.list('-created_date');
      const weekOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      });

      const totalRevenue = weekOrders.reduce((sum, order) => sum + order.total_amount, 0);

      const ordersByStatus = weekOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const deliveryPersons = await DeliveryPerson.list();
      const deliveredOrders = weekOrders.filter(order => order.status === 'delivered');
      
      const deliveryStats = deliveryPersons.map(person => {
        const personOrders = deliveredOrders.filter(order => order.delivery_person_id === person.id);
        const earnings = personOrders.reduce((sum, order) => sum + (order.total_amount * 0.10), 0);
        const revenue = personOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const totalProducts = personOrders.reduce((sum, order) => {
          return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
        }, 0);
        
        // Calculate daily breakdown for this delivery person
        const dailyStats = Array.from({ length: 7 }, (_, i) => {
          const day = new Date(startOfWeek);
          day.setDate(day.getDate() + i);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayOrders = personOrders.filter(order => {
            const orderDate = new Date(order.created_date);
            return orderDate >= day && orderDate <= dayEnd;
          });
          
          return {
            date: day.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
            deliveries: dayOrders.length,
            revenue: dayOrders.reduce((sum, order) => sum + order.total_amount, 0),
            products: dayOrders.reduce((sum, order) => {
              return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
            }, 0)
          };
        });
        
        return {
          name: person.name,
          deliveries: personOrders.length,
          earnings: earnings,
          revenue: revenue,
          products: totalProducts,
          dailyBreakdown: dailyStats.filter(d => d.deliveries > 0)
        };
      }).filter(stat => stat.deliveries > 0)
        .sort((a, b) => b.deliveries - a.deliveries);

      // Daily breakdown for the week
      const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayOrders = weekOrders.filter(order => {
          const orderDate = new Date(order.created_date);
          return orderDate >= day && orderDate <= dayEnd;
        });
        
        const deliveredDayOrders = dayOrders.filter(o => o.status === 'delivered');
        const totalProducts = deliveredDayOrders.reduce((sum, order) => {
          return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
        }, 0);
        
        return {
          date: day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, order) => sum + order.total_amount, 0),
          products: totalProducts
        };
      });

      setWeeklySummary({
        totalOrders: weekOrders.length,
        totalRevenue,
        ordersByStatus,
        topDeliveryPersons: deliveryStats,
        dailyBreakdown
      });
    } catch (error) {
      console.error("Error loading weekly summary:", error);
    }
  }, [selectedDate]);

  const loadDailySummary = useCallback(async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all orders for the selected date
      const allOrders = await Order.list('-created_date');
      const dayOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });

      // Calculate total revenue
      const totalRevenue = dayOrders.reduce((sum, order) => sum + order.total_amount, 0);

      // Group orders by status
      const ordersByStatus = dayOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Get delivery person performance with detailed stats
      const deliveryPersons = await DeliveryPerson.list();
      const deliveredOrders = dayOrders.filter(order => order.status === 'delivered');
      
      const deliveryStats = deliveryPersons.map(person => {
        const personOrders = deliveredOrders.filter(order => order.delivery_person_id === person.id);
        const earnings = personOrders.reduce((sum, order) => sum + (order.total_amount * 0.10), 0);
        const revenue = personOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const totalProducts = personOrders.reduce((sum, order) => {
          return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
        }, 0);
        
        return {
          name: person.name,
          deliveries: personOrders.length,
          earnings: earnings,
          revenue: revenue,
          products: totalProducts
        };
      }).filter(stat => stat.deliveries > 0)
        .sort((a, b) => b.deliveries - a.deliveries);

      // Hourly breakdown
      const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
        const hourOrders = dayOrders.filter(order => {
          const orderHour = new Date(order.created_date).getHours();
          return orderHour === hour;
        });
        return {
          hour: `${hour}:00`,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum, order) => sum + order.total_amount, 0)
        };
      }).filter(hourData => hourData.orders > 0);

      setSummary({
        totalOrders: dayOrders.length,
        totalRevenue,
        ordersByStatus,
        topDeliveryPersons: deliveryStats,
        hourlyBreakdown
      });
    } catch (error) {
      console.error("Error loading daily summary:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailySummary();
    } else {
      loadWeeklySummary();
    }
  }, [loadDailySummary, loadWeeklySummary, viewMode]);

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

  const currentSummary = viewMode === 'daily' ? summary : weeklySummary;

  const summaryCards = [
    {
      title: "Total Orders",
      value: currentSummary.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Total Revenue",
      value: `₹${currentSummary.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600"
    },
    {
      title: "Delivered",
      value: currentSummary.ordersByStatus.delivered || 0,
      icon: Package,
      color: "text-green-600"
    },
    {
      title: "In Progress",
      value: (currentSummary.ordersByStatus.confirmed || 0) + 
             (currentSummary.ordersByStatus.preparing || 0) + 
             (currentSummary.ordersByStatus.out_for_delivery || 0),
      icon: Clock,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Order Summary</h2>
        <div className="flex gap-3">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                const displayDate = date.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <SelectItem key={dateString} value={dateString}>
                    {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : displayDate}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(currentSummary.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge className={getStatusColor(status)}>
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <span className="font-semibold">{count} orders</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Partners Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {currentSummary.topDeliveryPersons.map((person, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Truck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="font-medium">{person.name}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {person.deliveries} orders
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm ml-11">
                    <div>
                      <p className="text-gray-600">Products</p>
                      <p className="font-semibold">{person.products}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-semibold">₹{person.revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Earned</p>
                      <p className="font-semibold text-emerald-600">₹{person.earnings.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {currentSummary.topDeliveryPersons.length === 0 && (
                <p className="text-gray-500 text-center py-4">No deliveries completed {viewMode === 'daily' ? 'today' : 'this week'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly/Daily Breakdown */}
      {viewMode === 'daily' && summary.hourlyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Order Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.hourlyBreakdown.map((hourData, index) => (
                  <TableRow key={index}>
                    <TableCell>{hourData.hour}</TableCell>
                    <TableCell>{hourData.orders}</TableCell>
                    <TableCell>₹{hourData.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {viewMode === 'weekly' && weeklySummary.dailyBreakdown.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklySummary.dailyBreakdown.map((dayData, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{dayData.date}</TableCell>
                      <TableCell>{dayData.orders}</TableCell>
                      <TableCell>{dayData.products}</TableCell>
                      <TableCell>₹{dayData.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed Delivery Partner Day-wise Breakdown */}
          {weeklySummary.topDeliveryPersons.map((person, personIndex) => (
            person.dailyBreakdown.length > 0 && (
              <Card key={personIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    {person.name} - Day-wise Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Deliveries</p>
                      <p className="text-xl font-bold">{person.deliveries}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Products</p>
                      <p className="text-xl font-bold">{person.products}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-xl font-bold">₹{person.revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Earnings (10%)</p>
                      <p className="text-xl font-bold text-emerald-600">₹{person.earnings.toFixed(2)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Deliveries</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {person.dailyBreakdown.map((dayData, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{dayData.date}</TableCell>
                          <TableCell>{dayData.deliveries}</TableCell>
                          <TableCell>{dayData.products}</TableCell>
                          <TableCell>₹{dayData.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          ))}
        </>
      )}
    </div>
  );
}