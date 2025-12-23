import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Package, TrendingUp, Users, Clock, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function HostelPerformanceMetrics() {
  const [hostels, setHostels] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMetrics();
    }, 1000); // Delay initial load by 1 second
    return () => clearTimeout(timer);
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [hostelsData, ordersData, deliveryData] = await Promise.all([
        base44.entities.Hostel.list(),
        base44.entities.Order.list(),
        base44.entities.DeliveryPerson.list()
      ]);

      const hostelMetrics = {};
      
      hostelsData.forEach(hostel => {
        const hostelOrders = ordersData.filter(order => 
          order.delivery_address?.includes(hostel.name)
        );

        const totalOrders = hostelOrders.length;
        const completedOrders = hostelOrders.filter(o => o.status === "delivered").length;
        const totalRevenue = hostelOrders
          .filter(o => o.status === "delivered")
          .reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
        
        const deliveryTimes = hostelOrders
          .filter(o => o.status === "delivered" && o.created_date && o.updated_date)
          .map(o => {
            const created = new Date(o.created_date);
            const delivered = new Date(o.updated_date);
            return (delivered - created) / (1000 * 60); // minutes
          });
        
        const avgDeliveryTime = deliveryTimes.length > 0
          ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
          : 0;

        const assignedPersonnel = deliveryData.filter(d => 
          hostel.assigned_delivery_persons?.includes(d.id)
        );

        hostelMetrics[hostel.id] = {
          totalOrders,
          completedOrders,
          totalRevenue,
          avgOrderValue,
          avgDeliveryTime,
          assignedPersonnel: assignedPersonnel.length,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
        };
      });

      setHostels(hostelsData);
      setMetrics(hostelMetrics);
    } catch (error) {
      console.error("Error loading metrics:", error);
      // Retry after delay if rate limited
      if (error.message?.includes('Rate limit')) {
        setTimeout(() => loadMetrics(), 5000);
      }
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading performance metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hostel Performance Metrics</h2>
        <p className="text-gray-600">Track delivery performance across all hostels</p>
      </div>

      <div className="grid gap-6">
        {hostels.map((hostel, idx) => {
          const metric = metrics[hostel.id] || {};
          
          return (
            <motion.div
              key={hostel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{hostel.name}</CardTitle>
                        <p className="text-sm text-gray-500">{hostel.code}</p>
                      </div>
                    </div>
                    <Badge variant={hostel.is_active ? "default" : "secondary"}>
                      {hostel.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">Total Orders</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{metric.totalOrders || 0}</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Completed</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{metric.completedOrders || 0}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {metric.completionRate?.toFixed(1) || 0}% rate
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-purple-600 font-medium">Revenue</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        ₹{metric.totalRevenue?.toFixed(0) || 0}
                      </p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-orange-600 font-medium">Avg Order</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">
                        ₹{metric.avgOrderValue?.toFixed(0) || 0}
                      </p>
                    </div>

                    <div className="bg-cyan-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-cyan-600" />
                        <span className="text-xs text-cyan-600 font-medium">Avg Time</span>
                      </div>
                      <p className="text-2xl font-bold text-cyan-900">
                        {metric.avgDeliveryTime?.toFixed(0) || 0}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">minutes</p>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-indigo-600 font-medium">Personnel</span>
                      </div>
                      <p className="text-2xl font-bold text-indigo-900">
                        {metric.assignedPersonnel || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {hostels.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hostels to display</h3>
          <p className="text-gray-600">Add hostels to view performance metrics</p>
        </Card>
      )}
    </div>
  );
}