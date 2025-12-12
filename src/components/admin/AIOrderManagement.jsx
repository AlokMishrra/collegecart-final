import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AIOrderManagement() {
  const [orders, setOrders] = useState([]);
  const [flaggedOrders, setFlaggedOrders] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await base44.entities.Order.filter({ 
        status: { $in: ['pending', 'confirmed', 'preparing'] } 
      }, '-created_date', 50);
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const analyzeOrders = async () => {
    setIsAnalyzing(true);
    try {
      const orderData = orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        user_id: o.user_id,
        total_amount: o.total_amount,
        items_count: o.items?.length || 0,
        delivery_address: o.delivery_address,
        payment_method: o.payment_method,
        created_date: o.created_date
      }));

      const prompt = `Analyze these orders for fraud, delivery delays, and high-risk factors:

${JSON.stringify(orderData.slice(0, 20), null, 2)}

Fraud Detection Criteria:
- Unusually large orders from new customers
- Multiple orders in short time
- High-value items with cash payment
- Suspicious delivery addresses
- Payment method patterns

For each order, identify:
1. Fraud risk (0-100) with specific fraud indicators
2. Delivery delay risk (0-100)
3. Risk factors with confidence scores
4. Recommended actions

Return JSON array:
[{
  "order_id": "id",
  "fraud_score": <0-100>,
  "fraud_indicators": ["indicator1", "indicator2"],
  "delay_score": <0-100>,
  "risk_level": "low|medium|high|critical",
  "risk_factors": ["factor1", "factor2"],
  "recommended_action": "string",
  "auto_flag": <boolean>
}]`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analyses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order_id: { type: "string" },
                  fraud_score: { type: "number" },
                  fraud_indicators: { type: "array", items: { type: "string" } },
                  delay_score: { type: "number" },
                  risk_level: { type: "string" },
                  risk_factors: { type: "array", items: { type: "string" } },
                  recommended_action: { type: "string" },
                  auto_flag: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      const highRisk = (analysis.analyses || []).filter(a => 
        ['high', 'critical'].includes(a.risk_level) || a.fraud_score > 70
      );

      setFlaggedOrders(highRisk);

      // Create notifications for high-risk orders
      for (const risk of highRisk) {
        const order = orders.find(o => o.id === risk.order_id);
        if (order) {
          await base44.entities.Notification.create({
            user_id: (await base44.auth.me()).id,
            title: `⚠️ High-Risk Order: #${order.order_number}`,
            message: `Fraud score: ${risk.fraud_score}, ${risk.risk_factors.join(', ')}`,
            type: "warning"
          });
        }
      }

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Order Analysis Complete",
        message: `Analyzed ${orders.length} orders, ${highRisk.length} flagged`,
        type: "success"
      });
    } catch (error) {
      console.error("Error analyzing orders:", error);
      alert("Failed to analyze orders");
    }
    setIsAnalyzing(false);
  };

  const getRiskColor = (level) => {
    switch(level) {
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
            <Shield className="w-6 h-6 text-blue-600" />
            AI Order Management
          </h2>
          <p className="text-gray-600">Fraud detection, delay prediction & risk analysis</p>
        </div>
        <Button onClick={analyzeOrders} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
          Analyze Orders
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Flagged Orders</p>
                <p className="text-2xl font-bold text-red-600">{flaggedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Delay Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {flaggedOrders.filter(f => f.delay_score > 60).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {flaggedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>High-Risk Orders Requiring Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Fraud Score</TableHead>
                  <TableHead>Delay Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Risk Factors</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedOrders.map(risk => {
                  const order = orders.find(o => o.id === risk.order_id);
                  return (
                    <TableRow key={risk.order_id}>
                      <TableCell>
                        {order ? `#${order.order_number}` : 'N/A'}
                        <br />
                        <span className="text-xs text-gray-500">₹{order?.total_amount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={risk.fraud_score > 80 ? 'bg-red-600' : 'bg-orange-600'}>
                          {risk.fraud_score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={risk.delay_score > 80 ? 'bg-red-600' : 'bg-yellow-600'}>
                          {risk.delay_score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(risk.risk_level)}>{risk.risk_level}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {risk.risk_factors.slice(0, 2).join(', ')}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {risk.recommended_action}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}