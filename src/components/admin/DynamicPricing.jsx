import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Zap, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

export default function DynamicPricing() {
  const [pricingRules, setPricingRules] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoPricingEnabled, setAutoPricingEnabled] = useState(false);

  const runPricingAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const [products, orders] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Order.list()
      ]);

      // Calculate product performance
      const productPerf = products.map(product => {
        const productOrders = orders.filter(o => 
          o.items?.some(item => item.product_id === product.id)
        );
        const totalSold = productOrders.reduce((sum, o) => {
          const item = o.items.find(i => i.product_id === product.id);
          return sum + (item?.quantity || 0);
        }, 0);
        
        return {
          id: product.id,
          name: product.name,
          currentPrice: product.price,
          stock: product.stock_quantity,
          totalSold,
          lowStockThreshold: product.low_stock_threshold
        };
      });

      const prompt = `Analyze products and recommend dynamic pricing adjustments:

PRODUCT DATA:
${productPerf.slice(0, 20).map(p => `- ${p.name}: ₹${p.currentPrice}, Stock ${p.stock}, Sold ${p.totalSold}`).join('\n')}

Objectives:
1. Maximize revenue
2. Clear slow-moving inventory
3. Optimize stock turnover
4. Competitive pricing

For EACH product provide:
- Optimal price (consider demand, stock, competition)
- Pricing strategy reason
- Expected revenue impact
- Urgency of change

Return JSON:
[{
  "product_id": "id",
  "product_name": "string",
  "current_price": <number>,
  "recommended_price": <number>,
  "price_change_percent": <number>,
  "strategy": "high_demand|clear_stock|competitive|premium",
  "reason": "string",
  "expected_revenue_impact": <number>,
  "urgency": "low|medium|high",
  "auto_apply_recommended": <boolean>
}]`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            pricing_rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  product_name: { type: "string" },
                  current_price: { type: "number" },
                  recommended_price: { type: "number" },
                  price_change_percent: { type: "number" },
                  strategy: { type: "string" },
                  reason: { type: "string" },
                  expected_revenue_impact: { type: "number" },
                  urgency: { type: "string" },
                  auto_apply_recommended: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      setPricingRules(analysis.pricing_rules || []);

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Dynamic Pricing Analysis Complete",
        message: `Generated recommendations for ${products.length} products`,
        type: "success"
      });
    } catch (error) {
      console.error("Error analyzing pricing:", error);
      alert("Failed to run pricing analysis");
    }
    setIsAnalyzing(false);
  };

  const applyPricing = async (rule) => {
    try {
      await base44.entities.Product.update(rule.product_id, {
        price: rule.recommended_price
      });

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Price Updated",
        message: `${rule.product_name} price adjusted to ₹${rule.recommended_price}`,
        type: "success"
      });

      setPricingRules(prev => prev.filter(r => r.product_id !== rule.product_id));
    } catch (error) {
      console.error("Error applying pricing:", error);
    }
  };

  const applyAllRecommended = async () => {
    const recommended = pricingRules.filter(r => r.auto_apply_recommended);
    for (const rule of recommended) {
      await applyPricing(rule);
    }
  };

  const getStrategyColor = (strategy) => {
    switch(strategy) {
      case 'high_demand': return 'bg-green-600';
      case 'clear_stock': return 'bg-orange-600';
      case 'competitive': return 'bg-blue-600';
      default: return 'bg-purple-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-600" />
            Dynamic Pricing Engine
          </h2>
          <p className="text-gray-600">AI-powered pricing optimization</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
            <span className="text-sm font-medium">Auto-Pricing</span>
            <Switch checked={autoPricingEnabled} onCheckedChange={setAutoPricingEnabled} />
          </div>
          <Button onClick={runPricingAnalysis} disabled={isAnalyzing} className="bg-yellow-600 hover:bg-yellow-700">
            {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            Analyze Pricing
          </Button>
        </div>
      </div>

      {pricingRules.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">{pricingRules.length} pricing recommendations</p>
            <Button 
              onClick={applyAllRecommended} 
              variant="outline"
              disabled={!pricingRules.some(r => r.auto_apply_recommended)}
            >
              Apply All Recommended ({pricingRules.filter(r => r.auto_apply_recommended).length})
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Recommended</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingRules.map((rule, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.product_name}</p>
                          <p className="text-xs text-gray-500">{rule.reason}</p>
                        </div>
                      </TableCell>
                      <TableCell>₹{rule.current_price}</TableCell>
                      <TableCell className="font-semibold">₹{rule.recommended_price}</TableCell>
                      <TableCell>
                        <Badge className={rule.price_change_percent > 0 ? 'bg-green-600' : 'bg-red-600'}>
                          {rule.price_change_percent > 0 ? '+' : ''}{rule.price_change_percent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStrategyColor(rule.strategy)}>
                          {rule.strategy.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className={rule.expected_revenue_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                            {rule.expected_revenue_impact > 0 ? '+' : ''}₹{rule.expected_revenue_impact.toFixed(0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => applyPricing(rule)}>
                          Apply
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}