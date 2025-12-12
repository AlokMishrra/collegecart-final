import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Truck, DollarSign } from "lucide-react";

export default function AdminStats() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalDeliveryPersons: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [products, orders, deliveryPersons] = await Promise.all([
        Product.list(),
        Order.list(),
        DeliveryPerson.list()
      ]);

      // Calculate total revenue from delivered orders only
      const totalRevenue = orders
        .filter(order => order.status === "delivered")
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalDeliveryPersons: deliveryPersons.length,
        totalRevenue
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-blue-500"
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "bg-emerald-500"
    },
    {
      title: "Delivery Partners",
      value: stats.totalDeliveryPersons,
      icon: Truck,
      color: "bg-purple-500"
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full ${stat.color} bg-opacity-20`}>
              <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}