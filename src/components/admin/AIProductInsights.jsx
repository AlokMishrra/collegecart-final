import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, DollarSign, Tag, TrendingUp, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AIProductInsights() {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const runProductAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const [reviews, orders, categories] = await Promise.all([
        base44.entities.Review.filter({ is_approved: true }),
        base44.entities.Order.list(),
        base44.entities.Category.list()
      ]);

      // Analyze product performance
      const productPerformance = products.map(product => {
        const productReviews = reviews.filter(r => r.product_id === product.id);
        const avgRating = productReviews.length > 0 
          ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
          : 0;
        
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
          price: product.price,
          avgRating,
          totalSold,
          reviewCount: productReviews.length
        };
      });

      const prompt = `Analyze products and provide AI-driven insights:

PRODUCT DATA:
${JSON.stringify(productPerformance.slice(0, 20), null, 2)}

CUSTOMER FEEDBACK:
${reviews.slice(0, 30).map(r => `- ${r.product_id}: ${r.rating}/5 - ${r.comment}`).join('\n')}

Provide:
1. Feature Requests: Top 5 feature/product requests from customer feedback
2. Product Improvements: Specific improvements for existing products
3. Pricing Strategies: AI-recommended pricing adjustments
4. Auto-categorization: Suggest tags/categories for products without proper categorization

Return JSON:
{
  "feature_requests": [{
    "request": "string",
    "demand_level": "low|medium|high",
    "potential_revenue": <number>,
    "implementation_priority": "low|medium|high"
  }],
  "product_improvements": [{
    "product_id": "id",
    "product_name": "string",
    "current_issues": ["issue1", "issue2"],
    "recommendations": ["rec1", "rec2"],
    "expected_impact": "string"
  }],
  "pricing_strategies": [{
    "product_id": "id",
    "product_name": "string",
    "current_price": <number>,
    "recommended_price": <number>,
    "reason": "string",
    "expected_impact": "string"
  }],
  "categorization_suggestions": [{
    "product_id": "id",
    "product_name": "string",
    "suggested_tags": ["tag1", "tag2"],
    "suggested_category": "string"
  }]
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            feature_requests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  request: { type: "string" },
                  demand_level: { type: "string" },
                  potential_revenue: { type: "number" },
                  implementation_priority: { type: "string" }
                }
              }
            },
            product_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  product_name: { type: "string" },
                  current_issues: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                  expected_impact: { type: "string" }
                }
              }
            },
            pricing_strategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  product_name: { type: "string" },
                  current_price: { type: "number" },
                  recommended_price: { type: "number" },
                  reason: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            categorization_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  product_name: { type: "string" },
                  suggested_tags: { type: "array", items: { type: "string" } },
                  suggested_category: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(analysis);

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Product Analysis Complete",
        message: `Generated insights for ${products.length} products`,
        type: "success"
      });
    } catch (error) {
      console.error("Error analyzing products:", error);
      alert("Failed to analyze products");
    }
    setIsAnalyzing(false);
  };

  const applyPricingStrategy = async (strategy) => {
    try {
      await base44.entities.Product.update(strategy.product_id, {
        price: strategy.recommended_price
      });

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Price Updated",
        message: `${strategy.product_name} price updated to ₹${strategy.recommended_price}`,
        type: "success"
      });

      loadProducts();
    } catch (error) {
      console.error("Error updating price:", error);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            AI Product Intelligence
          </h2>
          <p className="text-gray-600">Feature requests, pricing strategies & auto-categorization</p>
        </div>
        <Button onClick={runProductAnalysis} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Analyze Products
        </Button>
      </div>

      {/* Feature Requests */}
      {insights?.feature_requests && insights.feature_requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Feature Requests from Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.feature_requests.map((request, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-600">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getPriorityColor(request.implementation_priority)}>
                          {request.implementation_priority} priority
                        </Badge>
                        <Badge className="bg-green-600">{request.demand_level} demand</Badge>
                      </div>
                      <p className="font-medium text-gray-900">{request.request}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Potential Revenue</p>
                      <p className="text-lg font-bold text-green-600">₹{request.potential_revenue?.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Improvements */}
      {insights?.product_improvements && insights.product_improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Improvement Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.product_improvements.map((improvement, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">{improvement.product_name}</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Current Issues:</p>
                      <ul className="list-disc list-inside text-gray-700">
                        {improvement.current_issues?.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Recommendations:</p>
                      <ul className="list-disc list-inside text-gray-700">
                        {improvement.recommendations?.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-blue-900 text-xs">Expected Impact: {improvement.expected_impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Strategies */}
      {insights?.pricing_strategies && insights.pricing_strategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              AI-Recommended Pricing Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Recommended Price</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.pricing_strategies.map((strategy, idx) => {
                  const change = strategy.recommended_price - strategy.current_price;
                  const changePercent = ((change / strategy.current_price) * 100).toFixed(1);
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{strategy.product_name}</TableCell>
                      <TableCell>₹{strategy.current_price}</TableCell>
                      <TableCell className="font-semibold">₹{strategy.recommended_price}</TableCell>
                      <TableCell>
                        <Badge className={change > 0 ? 'bg-green-600' : 'bg-red-600'}>
                          {change > 0 ? '+' : ''}{changePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">{strategy.reason}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => applyPricingStrategy(strategy)}>
                          Apply
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Categorization Suggestions */}
      {insights?.categorization_suggestions && insights.categorization_suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600" />
              Auto-Categorization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.categorization_suggestions.map((suggestion, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                  <p className="font-medium mb-2">{suggestion.product_name}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {suggestion.suggested_tags?.map((tag, i) => (
                      <Badge key={i} variant="outline" className="bg-white">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">Suggested Category: {suggestion.suggested_category}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}