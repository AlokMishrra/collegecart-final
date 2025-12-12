import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, CheckCircle } from "lucide-react";

export default function AISupportAssistant() {
  const [orderNumber, setOrderNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [solution, setSolution] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSupportIssue = async () => {
    if (!orderNumber || !issue) return;
    
    setIsAnalyzing(true);
    try {
      const [orders, allOrders] = await Promise.all([
        base44.entities.Order.filter({ order_number: orderNumber }),
        base44.entities.Order.list()
      ]);

      if (orders.length === 0) {
        setSolution({
          found: false,
          message: "Order not found. Please check the order number."
        });
        setIsAnalyzing(false);
        return;
      }

      const order = orders[0];
      
      // Get historical data for context
      const similarIssues = allOrders.filter(o => 
        o.status === 'cancelled' || o.delivery_notes
      ).slice(0, 20);

      const prompt = `Analyze this customer support issue and provide solutions:

CURRENT ISSUE:
Order: #${order.order_number}
Customer: ${order.customer_name}
Status: ${order.status}
Total: ₹${order.total_amount}
Items: ${order.items?.length || 0}
Issue Description: ${issue}

HISTORICAL CONTEXT:
Similar resolved cases: ${similarIssues.length}

Provide:
1. Root cause analysis
2. Step-by-step solution
3. Compensation recommendation (if needed)
4. Prevention measures
5. Estimated resolution time

Return JSON:
{
  "root_cause": "string",
  "severity": "low|medium|high|critical",
  "solution_steps": ["step1", "step2", "step3"],
  "compensation_recommended": <boolean>,
  "compensation_type": "refund|discount|points|null",
  "compensation_amount": <number>,
  "prevention_measures": ["measure1", "measure2"],
  "estimated_resolution_time": "string",
  "follow_up_actions": ["action1", "action2"]
}`;

      const aiSolution = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            root_cause: { type: "string" },
            severity: { type: "string" },
            solution_steps: { type: "array", items: { type: "string" } },
            compensation_recommended: { type: "boolean" },
            compensation_type: { type: ["string", "null"] },
            compensation_amount: { type: "number" },
            prevention_measures: { type: "array", items: { type: "string" } },
            estimated_resolution_time: { type: "string" },
            follow_up_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSolution({
        found: true,
        order,
        ...aiSolution
      });

    } catch (error) {
      console.error("Error analyzing issue:", error);
      setSolution({
        found: false,
        message: "Failed to analyze issue. Please try again."
      });
    }
    setIsAnalyzing(false);
  };

  const applyCompensation = async () => {
    if (!solution?.compensation_recommended || !solution.order) return;
    
    try {
      if (solution.compensation_type === 'points') {
        await base44.entities.LoyaltyTransaction.create({
          user_id: solution.order.user_id,
          points: solution.compensation_amount,
          transaction_type: "bonus",
          description: `Compensation for order #${solution.order.order_number}`,
          balance_after: 0
        });
      }

      await base44.entities.Notification.create({
        user_id: solution.order.user_id,
        title: "Issue Resolved - Compensation Added",
        message: `We've added ${solution.compensation_amount} ${solution.compensation_type === 'points' ? 'loyalty points' : '₹'} as compensation for order #${solution.order.order_number}`,
        type: "success"
      });

      alert("Compensation applied successfully!");
      setSolution(null);
      setOrderNumber("");
      setIssue("");
    } catch (error) {
      console.error("Error applying compensation:", error);
    }
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" />
          AI Support Assistant
        </h2>
        <p className="text-gray-600">Resolve customer issues faster with AI-powered solutions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Support Issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Order Number</label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g., ORD001"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Issue Description</label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe the customer's issue..."
              className="w-full p-3 border rounded-lg resize-none"
              rows={4}
            />
          </div>
          <Button 
            onClick={analyzeSupportIssue} 
            disabled={isAnalyzing || !orderNumber || !issue}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Analyze & Get Solution
          </Button>
        </CardContent>
      </Card>

      {solution && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI-Generated Solution</CardTitle>
              {solution.found && (
                <Badge className={getSeverityColor(solution.severity)}>
                  {solution.severity} severity
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!solution.found ? (
              <p className="text-gray-600">{solution.message}</p>
            ) : (
              <>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-900 mb-1">Root Cause</p>
                  <p className="text-sm text-gray-700">{solution.root_cause}</p>
                </div>

                <div>
                  <p className="font-semibold mb-2">Solution Steps</p>
                  <ol className="space-y-2">
                    {solution.solution_steps?.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {solution.compensation_recommended && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-semibold text-yellow-900 mb-2">Compensation Recommended</p>
                    <p className="text-sm text-gray-700 mb-3">
                      {solution.compensation_amount} {solution.compensation_type === 'points' ? 'loyalty points' : '₹'} 
                      {solution.compensation_type === 'discount' ? ' discount on next order' : ''}
                    </p>
                    <Button size="sm" onClick={applyCompensation} className="bg-yellow-600 hover:bg-yellow-700">
                      Apply Compensation
                    </Button>
                  </div>
                )}

                <div>
                  <p className="font-semibold mb-2">Prevention Measures</p>
                  <ul className="space-y-1">
                    {solution.prevention_measures?.map((measure, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {measure}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Resolution Time</p>
                    <p className="font-semibold">{solution.estimated_resolution_time}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}