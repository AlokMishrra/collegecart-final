import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Users, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UnifiedAIDashboard() {
  const [insights, setInsights] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    churnRisk: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orders, users, churnPreds] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list(),
        base44.entities.ChurnPrediction.list()
      ]);

      const revenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      const highRiskCustomers = churnPreds.filter(p => ['high', 'critical'].includes(p.risk_level)).length;

      setMetrics({
        revenue,
        orders: orders.length,
        customers: users.filter(u => u.role !== 'admin').length,
        churnRisk: highRiskCustomers
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const [orders, users, products, campaigns, reviews] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list(),
        base44.entities.Product.list(),
        base44.entities.MarketingCampaign.list(),
        base44.entities.Review.list()
      ]);

      // Group orders by day for trend analysis
      const ordersByDay = {};
      orders.forEach(order => {
        const day = new Date(order.created_date).toLocaleDateString();
        if (!ordersByDay[day]) {
          ordersByDay[day] = { count: 0, revenue: 0 };
        }
        ordersByDay[day].count++;
        ordersByDay[day].revenue += order.total_amount;
      });

      const dailyData = Object.entries(ordersByDay).map(([day, data]) => ({
        day,
        orders: data.count,
        revenue: data.revenue
      }));

      const prompt = `Analyze business performance and provide AI insights:

METRICS:
- Total Revenue: ₹${metrics.revenue}
- Total Orders: ${orders.length}
- Active Customers: ${users.filter(u => u.role !== 'admin').length}
- Products: ${products.length}
- Active Campaigns: ${campaigns.filter(c => c.status === 'active').length}

DAILY TRENDS (last 7 days):
${JSON.stringify(dailyData.slice(-7), null, 2)}

REVIEWS:
- Total: ${reviews.length}
- Average Rating: ${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)}

Provide:
1. Anomaly Detection: Identify unusual patterns in sales, orders, or customer behavior
2. Predictive Analytics: Forecast next 7 days revenue and orders
3. Customer Insights: CLV predictions and growth opportunities
4. Business Recommendations: Top 3 actionable recommendations

Return JSON:
{
  "anomalies": [{
    "type": "string",
    "severity": "low|medium|high|critical",
    "description": "string",
    "impact": "string",
    "recommendation": "string"
  }],
  "predictions": {
    "next_7_days_revenue": <number>,
    "next_7_days_orders": <number>,
    "growth_rate": <number>,
    "confidence": <number>
  },
  "customer_insights": {
    "avg_customer_lifetime_value": <number>,
    "top_customer_segments": ["segment1", "segment2"],
    "retention_rate": <number>
  },
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            predictions: {
              type: "object",
              properties: {
                next_7_days_revenue: { type: "number" },
                next_7_days_orders: { type: "number" },
                growth_rate: { type: "number" },
                confidence: { type: "number" }
              }
            },
            customer_insights: {
              type: "object",
              properties: {
                avg_customer_lifetime_value: { type: "number" },
                top_customer_segments: { type: "array", items: { type: "string" } },
                retention_rate: { type: "number" }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setInsights(analysis);
      setAnomalies(analysis.anomalies || []);
      setPredictions(analysis.predictions);

      // Notify on critical anomalies
      const critical = (analysis.anomalies || []).filter(a => a.severity === 'critical');
      if (critical.length > 0) {
        await base44.entities.Notification.create({
          user_id: (await base44.auth.me()).id,
          title: "🚨 Critical Anomaly Detected",
          message: `${critical[0].description}`,
          type: "warning"
        });
      }

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "AI Analysis Complete",
        message: "Business insights and predictions are ready",
        type: "success"
      });
    } catch (error) {
      console.error("Error running analysis:", error);
      alert("Failed to run AI analysis");
    }
    setIsAnalyzing(false);
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Business Intelligence
          </h2>
          <p className="text-gray-600">Unified insights, anomaly detection & predictive analytics</p>
        </div>
        <Button onClick={runAIAnalysis} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Run AI Analysis
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{metrics.revenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{metrics.orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold">{metrics.customers}</p>
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
                <p className="text-sm text-gray-600">Churn Risk</p>
                <p className="text-2xl font-bold text-red-600">{metrics.churnRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Detected Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity}</Badge>
                      <span className="font-semibold">{anomaly.type}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{anomaly.description}</p>
                    <p className="text-xs text-gray-600">Impact: {anomaly.impact}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
                  <p className="text-sm text-blue-900">💡 {anomaly.recommendation}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      {predictions && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Revenue Forecast (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Predicted Revenue</span>
                    <span className="text-2xl font-bold text-green-600">₹{predictions.next_7_days_revenue?.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Growth Rate</span>
                    <span className="text-lg font-semibold">{predictions.growth_rate?.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Confidence: {predictions.confidence?.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Order Forecast (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Predicted Orders</span>
                    <span className="text-2xl font-bold text-blue-600">{predictions.next_7_days_orders?.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Daily Average</span>
                    <span className="text-lg font-semibold">{(predictions.next_7_days_orders / 7)?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Insights */}
      {insights?.customer_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Customer Lifetime Value</p>
                <p className="text-2xl font-bold text-purple-600">₹{insights.customer_insights.avg_customer_lifetime_value?.toFixed(0)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Retention Rate</p>
                <p className="text-2xl font-bold text-blue-600">{insights.customer_insights.retention_rate?.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Top Segments</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {insights.customer_insights.top_customer_segments?.map((seg, idx) => (
                    <Badge key={idx} className="bg-green-600">{seg}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-l-4 border-purple-600">
                  <p className="text-sm font-medium text-gray-900">{idx + 1}. {rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}