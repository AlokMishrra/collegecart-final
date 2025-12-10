
import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";
import { Package, Clock, Truck, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadOrders = useCallback(async (userId) => {
    setIsLoading(true);
    try {
      const userOrders = await Order.filter({ user_id: userId }, '-created_date');
      setOrders(userOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
    setIsLoading(false);
  }, []); // Dependencies are empty because it doesn't rely on any state/props that change during the component's lifecycle

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      loadOrders(currentUser.id);
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
  }, [navigate, loadOrders]); // Added navigate and loadOrders as dependencies

  useEffect(() => {
    checkUser();
  }, [checkUser]); // checkUser is now stable due to useCallback

  const getStatusIcon = (status) => {
    const iconMap = {
      pending: Clock,
      confirmed: Package,
      preparing: Package,
      out_for_delivery: Truck,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    return iconMap[status] || Clock;
  };

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h2>
        <p className="text-gray-600 mb-8">Start shopping to see your orders here!</p>
        <button
          onClick={() => navigate(createPageUrl('Shop'))}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order, index) => {
          const StatusIcon = getStatusIcon(order.status);
          
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">Order {order.order_number}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Placed for <span className="font-medium">{order.customer_name}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(order.status)}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xl font-bold text-emerald-600">
                        ₹{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Items ({order.items.length})</h4>
                    <div className="space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center text-sm">
                          <span>{item.product_name} x {item.quantity}</span>
                          <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-900">Delivery Address</h4>
                        <p className="text-gray-600 mt-1">{order.delivery_address}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Contact</h4>
                        <p className="text-gray-600 mt-1">{order.phone_number}</p>
                      </div>
                    </div>
                    {order.delivery_notes && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900">Delivery Notes</h4>
                        <p className="text-gray-600 mt-1">{order.delivery_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
