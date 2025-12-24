import React from "react";
import { Product } from "@/entities/Product";
import { Order } from "@/entities/Order";
import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Truck, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminStats() {
  const { data: stats = {
    totalProducts: 0,
    totalOrders: 0,
    totalDeliveryPersons: 0,
    totalRevenue: 0
  } } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, orders, deliveryPersons] = await Promise.all([
        Product.list(),
        Order.list(),
        DeliveryPerson.list()
      ]);

      // Calculate total revenue from delivered orders only, minus 65 Rs
      const totalRevenue = Math.max(0, orders
        .filter(order => order.status === "delivered")
        .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) - 65);

      return {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalDeliveryPersons: deliveryPersons.length,
        totalRevenue
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

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
      value: `₹${stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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