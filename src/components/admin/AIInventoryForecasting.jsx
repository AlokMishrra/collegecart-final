import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AIInventoryForecasting() {
  const [forecasts, setForecasts] = useState([]);
  const [isForecasting, setIsForecasting] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await base44.entities.Product.list();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const runInventoryForecast = async () => {
    setIsForecasting(true);
    try {
      const [orders, categories] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.Category.list()
      ]);

      // Analyze sales patterns
      const productSales = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              productId: item.product_id,
              productName: item.product_name,
              totalSold: 0,
              orderDates: []
            };
          }
          productSales[item.product_id].totalSold += item.quantity;
          productSales[item.product_id].orderDates.push(new Date(order.created_date));
        });
      });

      const salesData = Object.values(productSales).map(sale => {
        const product = products.find(p => p.id === sale.productId);
        return {
          ...sale,
          currentStock: product?.stock_quantity || 0,
          lowStockThreshold: product?.low_stock_threshold || 10
        };
      });

      const prompt = `Analyze inventory and forecast needs for the next 30 days:

CURRENT INVENTORY:
${salesData.slice(0, 20).map(s => `- ${s.productName}: Stock ${s.currentStock}, Sold ${s.totalSold}`).join('\n')}

Current Date: ${new Date().toLocaleDateString()}
Season: ${['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'][new Date().getMonth()]}

For EACH product provide:
1. Predicted demand (next 7, 14, 30 days)
2. Recommended reorder quantity
3. Reorder urgency (low/medium/high/critical)
4. Seasonal factors
5. Stock-out risk

Return JSON array:
[{
  "product_id": "id",
  "product_name": "string",
  "current_stock": <number>,
  "demand_7_days": <number>,
  "demand_14_days": <number>,
  "demand_30_days": <number>,
  "recommended_reorder": <number>,
  "reorder_urgency": "low|medium|high|critical",
  "seasonal_impact": "string",
  "stockout_risk": <0-100>,
  "optimal_reorder_date": "string"
}]`;

      const aiForecasts = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            forecasts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  product_name: { type: "string" },
                  current_stock: { type: "number" },
                  demand_7_days: { type: "number" },
                  demand_14_days: { type: "number" },
                  demand_30_days: { type: "number" },
                  recommended_reorder: { type: "number" },
                  reorder_urgency: { type: "string" },
                  seasonal_impact: { type: "string" },
                  stockout_risk: { type: "number" },
                  optimal_reorder_date: { type: "string" }
                }
              }
            }
          }
        }
      });

      setForecasts(aiForecasts.forecasts || []);

      // Alert for critical stock
      const critical = (aiForecasts.forecasts || []).filter(f => f.reorder_urgency === 'critical');
      if (critical.length > 0) {
        await base44.entities.Notification.create({
          user_id: (await base44.auth.me()).id,
          title: "⚠️ Critical Stock Alert",
          message: `${critical.length} products need urgent reordering`,
          type: "warning"
        });
      }

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Inventory Forecast Complete",
        message: `Generated forecasts for ${products.length} products`,
        type: "success"
      });
    } catch (error) {
      console.error("Error forecasting inventory:", error);
      alert("Failed to run inventory forecast");
    }
    setIsForecasting(false);
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            AI Inventory Forecasting
          </h2>
          <p className="text-gray-600">Predict demand and optimize stock levels</p>
        </div>
        <Button onClick={runInventoryForecast} disabled={isForecasting} className="bg-blue-600 hover:bg-blue-700">
          {isForecasting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
          Run Forecast
        </Button>
      </div>

      {forecasts.length > 0 && (
        <>
          {/* Critical Alerts */}
          {forecasts.filter(f => f.reorder_urgency === 'critical' || f.stockout_risk > 80).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {forecasts.filter(f => f.reorder_urgency === 'critical' || f.stockout_risk > 80).map((forecast, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{forecast.product_name}</p>
                          <p className="text-sm text-gray-600">Current Stock: {forecast.current_stock}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-red-600">Reorder {forecast.recommended_reorder} units</Badge>
                          <p className="text-xs text-gray-600 mt-1">By {forecast.optimal_reorder_date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Forecast Table */}
          <Card>
            <CardHeader>
              <CardTitle>30-Day Demand Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>7-Day Demand</TableHead>
                    <TableHead>30-Day Demand</TableHead>
                    <TableHead>Stockout Risk</TableHead>
                    <TableHead>Reorder</TableHead>
                    <TableHead>Urgency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((forecast, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{forecast.product_name}</TableCell>
                      <TableCell>{forecast.current_stock}</TableCell>
                      <TableCell>{forecast.demand_7_days}</TableCell>
                      <TableCell>{forecast.demand_30_days}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${forecast.stockout_risk > 70 ? 'bg-red-600' : forecast.stockout_risk > 40 ? 'bg-yellow-600' : 'bg-green-600'}`}
                              style={{ width: `${forecast.stockout_risk}%` }}
                            />
                          </div>
                          <span className="text-sm">{forecast.stockout_risk}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{forecast.recommended_reorder}</TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(forecast.reorder_urgency)}>
                          {forecast.reorder_urgency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Seasonal Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Seasonal Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {forecasts.slice(0, 6).map((forecast, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium mb-1">{forecast.product_name}</p>
                    <p className="text-sm text-gray-700">{forecast.seasonal_impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}