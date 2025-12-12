import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, Loader2, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewAnalytics() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reviewsData, productsData] = await Promise.all([
        base44.entities.Review.filter({ is_approved: true }),
        base44.entities.Product.list()
      ]);
      setReviews(reviewsData);
      
      const productsMap = {};
      productsData.forEach(p => productsMap[p.id] = p);
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const analyzeReviews = async () => {
    if (reviews.length === 0) {
      alert("No reviews to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const reviewTexts = reviews.map(r => ({
        product: products[r.product_id]?.name || "Unknown",
        rating: r.rating,
        comment: r.comment || "No comment"
      }));

      const prompt = `Analyze these customer reviews and provide comprehensive insights:

${JSON.stringify(reviewTexts, null, 2)}

Provide analysis in the following structure:
1. Overall sentiment (positive/negative/neutral percentage)
2. Average satisfaction score (1-10)
3. Top 5 positive themes with examples
4. Top 5 negative themes with examples
5. Key actionable insights for improvement
6. Product-specific feedback highlights

Return as JSON with this exact schema:
{
  "sentiment": {
    "positive": <percentage>,
    "negative": <percentage>,
    "neutral": <percentage>
  },
  "satisfaction_score": <number 1-10>,
  "positive_themes": [{"theme": "string", "frequency": <number>, "example": "string"}],
  "negative_themes": [{"theme": "string", "frequency": <number>, "example": "string"}],
  "actionable_insights": ["string"],
  "product_highlights": [{"product": "string", "feedback": "string"}]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sentiment: {
              type: "object",
              properties: {
                positive: { type: "number" },
                negative: { type: "number" },
                neutral: { type: "number" }
              }
            },
            satisfaction_score: { type: "number" },
            positive_themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  theme: { type: "string" },
                  frequency: { type: "number" },
                  example: { type: "string" }
                }
              }
            },
            negative_themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  theme: { type: "string" },
                  frequency: { type: "number" },
                  example: { type: "string" }
                }
              }
            },
            actionable_insights: {
              type: "array",
              items: { type: "string" }
            },
            product_highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  feedback: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalytics(result);
    } catch (error) {
      console.error("Error analyzing reviews:", error);
      alert("Failed to analyze reviews");
    }
    setIsAnalyzing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Review Analytics
          </h3>
          <p className="text-sm text-gray-600">
            Analyzing {reviews.length} approved reviews
          </p>
        </div>
        <Button
          onClick={analyzeReviews}
          disabled={isAnalyzing || reviews.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Reviews
            </>
          )}
        </Button>
      </div>

      {analytics && (
        <div className="space-y-6">
          {/* Sentiment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">
                    {analytics.sentiment.positive}%
                  </p>
                  <p className="text-sm text-gray-600">Positive</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-600">
                    {analytics.sentiment.neutral}%
                  </p>
                  <p className="text-sm text-gray-600">Neutral</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">
                    {analytics.sentiment.negative}%
                  </p>
                  <p className="text-sm text-gray-600">Negative</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Satisfaction</span>
                  <span className="text-sm font-bold">{analytics.satisfaction_score}/10</span>
                </div>
                <Progress value={analytics.satisfaction_score * 10} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Positive Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Positive Themes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.positive_themes.map((theme, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-green-900">{theme.theme}</p>
                      <Badge className="bg-green-600">{theme.frequency} mentions</Badge>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{theme.example}"</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Negative Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.negative_themes.map((theme, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-red-900">{theme.theme}</p>
                      <Badge className="bg-red-600">{theme.frequency} mentions</Badge>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{theme.example}"</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Actionable Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Actionable Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analytics.actionable_insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                    <span className="text-yellow-600 font-bold">{index + 1}.</span>
                    <span className="text-gray-800">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Product Highlights */}
          {analytics.product_highlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Product-Specific Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.product_highlights.map((highlight, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-blue-900 mb-1">{highlight.product}</p>
                    <p className="text-sm text-gray-700">{highlight.feedback}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}