import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Truck, DollarSign, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function DailyOrderSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: {},
    topDeliveryPersons: [],
    hourlyBreakdown: []
  });

  const loadDailySummary = useCallback(async () => {
    try {
      const startOfDay = new Date(selectedDate);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get all orders for the selected date
      const allOrders = await Order.list('-created_date');
      const dayOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate >= startOfDay && orderDate < endOfDay;
      });

      // Calculate total revenue
      const totalRevenue = dayOrders.reduce((sum, order) => sum + order.total_amount, 0);

      // Group orders by status
      const ordersByStatus = dayOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Get delivery person performance
      const deliveryPersons = await DeliveryPerson.list();
      const deliveredOrders = dayOrders.filter(order => order.status === 'delivered');
      
      const deliveryStats = deliveryPersons.map(person => {
        const personOrders = deliveredOrders.filter(order => order.delivery_person_id === person.id);
        const earnings = personOrders.reduce((sum, order) => sum + (order.total_amount * 0.10), 0);
        return {
          name: person.name,
          deliveries: personOrders.length,
          earnings: earnings
        };
      }).filter(stat => stat.deliveries > 0)
        .sort((a, b) => b.deliveries - a.deliveries)
        .slice(0, 5);

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
    loadDailySummary();
  }, [loadDailySummary]);

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

  const summaryCards = [
    {
      title: "Total Orders",
      value: summary.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Total Revenue",
      value: `₹${summary.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600"
    },
    {
      title: "Delivered",
      value: summary.ordersByStatus.delivered || 0,
      icon: Package,
      color: "text-green-600"
    },
    {
      title: "In Progress",
      value: (summary.ordersByStatus.confirmed || 0) + 
             (summary.ordersByStatus.preparing || 0) + 
             (summary.ordersByStatus.out_for_delivery || 0),
      icon: Clock,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Daily Order Summary</h2>
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
              {Object.entries(summary.ordersByStatus).map(([status, count]) => (
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

        {/* Top Delivery Persons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Delivery Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.topDeliveryPersons.map((person, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="font-medium">{person.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{person.deliveries} deliveries</p>
                    <p className="text-sm text-gray-600">₹{person.earnings} earned</p>
                  </div>
                </div>
              ))}
              {summary.topDeliveryPersons.length === 0 && (
                <p className="text-gray-500 text-center py-4">No deliveries completed today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Breakdown */}
      {summary.hourlyBreakdown.length > 0 && (
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
    </div>
  );
}