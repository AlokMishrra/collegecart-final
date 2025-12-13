import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, X, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ProductScheduler() {
  const [products, setProducts] = useState([]);
  const [scheduledProducts, setScheduledProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scheduleType, setScheduleType] = useState("available");
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await base44.entities.Product.list('-created_date');
      setProducts(productsData);
      
      // Filter products that have schedules
      const scheduled = productsData.filter(p => 
        p.scheduled_available_date || p.scheduled_unavailable_date
      );
      setScheduledProducts(scheduled);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleSchedule = async () => {
    if (!selectedProduct || !scheduleDateTime) {
      toast.error("Please select a product and date/time");
      return;
    }

    try {
      const updateData = scheduleType === "available" 
        ? { scheduled_available_date: scheduleDateTime }
        : { scheduled_unavailable_date: scheduleDateTime };

      await base44.entities.Product.update(selectedProduct, updateData);
      toast.success("Schedule set successfully");
      
      setSelectedProduct(null);
      setScheduleDateTime("");
      loadData();
    } catch (error) {
      console.error("Error scheduling:", error);
      toast.error("Failed to set schedule");
    }
  };

  const removeSchedule = async (productId, type) => {
    try {
      const updateData = type === "available"
        ? { scheduled_available_date: null }
        : { scheduled_unavailable_date: null };

      await base44.entities.Product.update(productId, updateData);
      toast.success("Schedule removed");
      loadData();
    } catch (error) {
      console.error("Error removing schedule:", error);
      toast.error("Failed to remove schedule");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          Product Scheduler
        </h2>
        <p className="text-gray-600">Schedule products to become available or unavailable automatically</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Create Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Product</Label>
              <select
                className="w-full p-2 border rounded-lg"
                value={selectedProduct || ""}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Choose a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.is_available ? "Available" : "Unavailable"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Schedule Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={scheduleType === "available" ? "default" : "outline"}
                  onClick={() => setScheduleType("available")}
                  className={scheduleType === "available" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Make Available
                </Button>
                <Button
                  variant={scheduleType === "unavailable" ? "default" : "outline"}
                  onClick={() => setScheduleType("unavailable")}
                  className={scheduleType === "unavailable" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Make Unavailable
                </Button>
              </div>
            </div>

            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSchedule}
              disabled={!selectedProduct || !scheduleDateTime}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Scheduled Products */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Products ({scheduledProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {scheduledProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No scheduled products yet</p>
                </div>
              ) : (
                scheduledProducts.map(product => (
                  <div key={product.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <Badge 
                          className={product.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          Currently {product.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>

                    {product.scheduled_available_date && (
                      <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">
                            Make available: {new Date(product.scheduled_available_date).toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSchedule(product.id, "available")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {product.scheduled_unavailable_date && (
                      <div className="flex items-center justify-between bg-red-50 p-2 rounded">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-red-600" />
                          <span className="text-red-700">
                            Make unavailable: {new Date(product.scheduled_unavailable_date).toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSchedule(product.id, "unavailable")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}