import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function DeliveryStats({ deliveryPerson }) {
  const [todayStats, setTodayStats] = useState({
    ordersDelivered: 0,
    incentiveEarned: 0,
    totalEarnings: 0,
    activeOrders: 0
  });

  const loadTodayStats = useCallback(async () => {
    if (!deliveryPerson) return;
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get all orders for this delivery person
      const allOrders = await Order.filter({
        delivery_person_id: deliveryPerson.id
      });

      // Filter orders delivered today
      const todayDelivered = allOrders.filter(order => {
        const orderDate = new Date(order.updated_date);
        return order.status === "delivered" && 
               orderDate >= startOfDay && 
               orderDate < endOfDay;
      });

      // Get active orders
      const activeOrders = allOrders.filter(order => 
        order.status === "out_for_delivery"
      );

      const ordersDeliveredCount = todayDelivered.length;
      // Calculate 10% of total order amounts for today's earnings
      const todayIncentive = todayDelivered.reduce((sum, order) => 
        sum + (order.total_amount * 0.10), 0
      );

      setTodayStats({
        ordersDelivered: ordersDeliveredCount,
        incentiveEarned: todayIncentive,
        totalEarnings: deliveryPerson.total_earnings || 0,
        activeOrders: activeOrders.length
      });
    } catch (error) {
      console.error("Error loading today's stats:", error);
    }
  }, [deliveryPerson]); // Dependency array for useCallback

  useEffect(() => {
    loadTodayStats();
  }, [loadTodayStats]); // Dependency array for useEffect now includes loadTodayStats

  const statCards = [
    {
      title: "Orders Delivered Today",
      value: todayStats.ordersDelivered,
      icon: Package,
      color: "bg-emerald-500",
      textColor: "text-emerald-600"
    },
    {
      title: "Today's Incentive",
      value: `₹${todayStats.incentiveEarned}`,
      icon: DollarSign,
      color: "bg-blue-500",
      textColor: "text-blue-600"
    },
    {
      title: "Total Earnings",
      value: `₹${todayStats.totalEarnings}`,
      icon: TrendingUp,
      color: "bg-purple-500",
      textColor: "text-purple-600"
    },
    {
      title: "Active Orders",
      value: todayStats.activeOrders,
      icon: Clock,
      color: "bg-orange-500",
      textColor: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} bg-opacity-20 rounded-full flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}