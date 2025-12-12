import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingDown, Gift, Mail, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomerRetention() {
  const [predictions, setPredictions] = useState([]);
  const [churnAnalysis, setChurnAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const data = await base44.entities.ChurnPrediction.list("-churn_risk_score", 50);
      setPredictions(data);
    } catch (error) {
      console.error("Error loading predictions:", error);
    }
  };

  const runChurnPrediction = async () => {
    setIsAnalyzing(true);
    try {
      const [users, orders, loyaltyTxns] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Order.list(),
        base44.entities.LoyaltyTransaction.list()
      ]);

      const customers = users.filter(u => u.role !== 'admin');

      const prompt = `Analyze customer data to predict churn risk:

Customer Data Summary:
${customers.map(c => {
  const customerOrders = orders.filter(o => o.user_id === c.id);
  const lastOrder = customerOrders[0];
  const daysSinceOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.created_date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const totalSpent = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const loyaltyPoints = loyaltyTxns.filter(t => t.user_id === c.id).reduce((sum, t) => sum + t.points, 0);
  
  return `- Customer ${c.id}: ${customerOrders.length} orders, ₹${totalSpent}, ${daysSinceOrder} days since last order, ${loyaltyPoints} points`;
}).slice(0, 30).join('\n')}

For EACH customer, calculate churn risk (0-100) and identify risk factors.

Return JSON array:
[{
  "user_id": "id",
  "churn_risk_score": <0-100>,
  "risk_level": "low|medium|high|critical",
  "factors": ["factor1", "factor2"]
}]`;

      const aiPredictions = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user_id: { type: "string" },
                  churn_risk_score: { type: "number" },
                  risk_level: { type: "string" },
                  factors: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      // Save predictions
      for (const pred of (aiPredictions.predictions || [])) {
        const customer = customers.find(c => c.id === pred.user_id);
        if (!customer) continue;

        const customerOrders = orders.filter(o => o.user_id === customer.id);
        const lastOrder = customerOrders[0];
        const daysSinceOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.created_date).getTime()) / (1000 * 60 * 60 * 24)) : 999;

        await base44.entities.ChurnPrediction.create({
          user_id: customer.id,
          churn_risk_score: pred.churn_risk_score,
          risk_level: pred.risk_level,
          prediction_date: new Date().toISOString(),
          factors: pred.factors,
          last_order_days_ago: daysSinceOrder,
          total_orders: customerOrders.length,
          retention_offer_sent: false
        });
      }

      // Analyze churn reasons
      const churnReasons = await analyzeChurnReasons(customers, orders);
      setChurnAnalysis(churnReasons);

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Churn Prediction Complete",
        message: `Analyzed ${customers.length} customers for churn risk`,
        type: "success"
      });

      loadPredictions();
    } catch (error) {
      console.error("Error running prediction:", error);
      alert("Failed to run churn prediction");
    }
    setIsAnalyzing(false);
  };

  const analyzeChurnReasons = async (customers, orders) => {
    const inactiveCustomers = customers.filter(c => {
      const customerOrders = orders.filter(o => o.user_id === c.id);
      const lastOrder = customerOrders[0];
      const daysSinceOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.created_date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return daysSinceOrder > 60;
    });

    const prompt = `Analyze why customers churned and suggest preventative measures:

Churned Customers: ${inactiveCustomers.length}
Active Customers: ${customers.length - inactiveCustomers.length}

Provide:
1. Top 5 reasons for churn
2. Preventative measures for each reason
3. Early warning signs to watch for

Return as JSON:
{
  "churn_reasons": [{"reason": "string", "percentage": <number>, "prevention": "string"}],
  "warning_signs": ["sign1", "sign2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          churn_reasons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                reason: { type: "string" },
                percentage: { type: "number" },
                prevention: { type: "string" }
              }
            }
          },
          warning_signs: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    return analysis;
  };

  const sendRetentionOffer = async (prediction) => {
    setIsSendingOffer(true);
    try {
      const user = await base44.entities.User.filter({ id: prediction.user_id });
      if (!user[0]) return;

      const offerAmount = prediction.risk_level === 'critical' ? 20 : 
                         prediction.risk_level === 'high' ? 15 : 10;

      // Create marketing campaign for retention
      const campaign = await base44.entities.MarketingCampaign.create({
        name: `Retention Offer - ${user[0].full_name}`,
        type: "both",
        target_segment: "custom",
        subject: "We Miss You! Special Offer Inside 🎁",
        message_variant_a: `Hi ${user[0].full_name}! We've noticed you haven't ordered in a while. Here's a special ${offerAmount}% discount just for you! Use code: COMEBACK${offerAmount}. Valid for 7 days. We'd love to serve you again! 💚`,
        enable_ab_testing: false,
        trigger_type: "immediate",
        status: "active"
      });

      // Send notification
      await base44.entities.Notification.create({
        user_id: user[0].id,
        title: "We Miss You! 🎁",
        message: `Special ${offerAmount}% discount waiting for you! Check your email.`,
        type: "info"
      });

      // Send email
      await base44.integrations.Core.SendEmail({
        to: user[0].email,
        subject: "We Miss You! Special Offer Inside 🎁",
        body: `Hi ${user[0].full_name}!\n\nWe've noticed you haven't ordered in a while and we miss you! 😊\n\nAs a valued customer, we'd like to offer you a special ${offerAmount}% discount on your next order.\n\nUse code: COMEBACK${offerAmount}\nValid for 7 days\n\nWe'd love to serve you again!\n\nBest regards,\nCollegeCart Team`
      });

      // Update prediction
      await base44.entities.ChurnPrediction.update(prediction.id, {
        retention_offer_sent: true,
        retention_offer_id: campaign.id
      });

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Retention Offer Sent",
        message: `Offer sent to ${user[0].full_name}`,
        type: "success"
      });

      loadPredictions();
    } catch (error) {
      console.error("Error sending offer:", error);
    }
    setIsSendingOffer(false);
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
            <TrendingDown className="w-6 h-6 text-orange-600" />
            Customer Retention AI
          </h2>
          <p className="text-gray-600">Predict and prevent customer churn</p>
        </div>
        <Button onClick={runChurnPrediction} disabled={isAnalyzing} className="bg-orange-600 hover:bg-orange-700">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Run Prediction
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Critical Risk</p>
            <p className="text-2xl font-bold text-red-600">{predictions.filter(p => p.risk_level === 'critical').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">High Risk</p>
            <p className="text-2xl font-bold text-orange-600">{predictions.filter(p => p.risk_level === 'high').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Offers Sent</p>
            <p className="text-2xl font-bold text-blue-600">{predictions.filter(p => p.retention_offer_sent).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Avg Risk Score</p>
            <p className="text-2xl font-bold">{predictions.length > 0 ? (predictions.reduce((sum, p) => sum + p.churn_risk_score, 0) / predictions.length).toFixed(1) : 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Analysis */}
      {churnAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Churn Analysis & Prevention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Top Churn Reasons</h4>
              {churnAnalysis.churn_reasons?.map((reason, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{reason.reason}</span>
                    <span className="text-sm text-gray-600">{reason.percentage}%</span>
                  </div>
                  <p className="text-sm text-gray-600">Prevention: {reason.prevention}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {churnAnalysis.recommendations?.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700">✓ {rec}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* At-Risk Customers */}
      <Card>
        <CardHeader>
          <CardTitle>At-Risk Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.filter(p => ['high', 'critical'].includes(p.risk_level)).slice(0, 10).map(pred => (
                <TableRow key={pred.id}>
                  <TableCell>{pred.user_id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pred.churn_risk_score} className="w-20" />
                      <span className="text-sm">{pred.churn_risk_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskColor(pred.risk_level)}>{pred.risk_level}</Badge>
                  </TableCell>
                  <TableCell>{pred.last_order_days_ago} days ago</TableCell>
                  <TableCell>{pred.total_orders}</TableCell>
                  <TableCell>
                    {!pred.retention_offer_sent ? (
                      <Button size="sm" onClick={() => sendRetentionOffer(pred)} disabled={isSendingOffer}>
                        <Gift className="w-3 h-3 mr-1" />
                        Send Offer
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700">Offer Sent</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}