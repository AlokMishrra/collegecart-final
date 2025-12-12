import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Bell, Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function FeedbackAnalysis() {
  const [analyses, setAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const data = await base44.entities.FeedbackAnalysis.list("-created_date", 10);
      setAnalyses(data);
    } catch (error) {
      console.error("Error loading analyses:", error);
    }
    setIsLoading(false);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Collect feedback from multiple sources
      const [reviews, products] = await Promise.all([
        base44.entities.Review.filter({ is_approved: true }),
        base44.entities.Product.list()
      ]);

      // Get chatbot conversations from localStorage (simplified)
      const chatbotData = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chatbot_conversation_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            chatbotData.push(...data);
          } catch (e) {}
        }
      }

      const feedbackData = {
        reviews: reviews.map(r => ({
          product: products.find(p => p.id === r.product_id)?.name,
          rating: r.rating,
          comment: r.comment,
          date: r.created_date
        })),
        chatbot_interactions: chatbotData.length,
        total_feedback_count: reviews.length + chatbotData.length
      };

      const prompt = `Analyze customer feedback data and provide comprehensive insights:

${JSON.stringify(feedbackData, null, 2)}

Provide detailed analysis in this exact JSON format:
{
  "emerging_issues": [
    {
      "issue": "Issue description",
      "severity": "low|medium|high|critical",
      "frequency": <number>,
      "examples": ["example1", "example2"]
    }
  ],
  "product_improvements": [
    {
      "product_id": "id or null",
      "product_name": "name",
      "suggestion": "Specific improvement suggestion",
      "priority": "low|medium|high"
    }
  ],
  "positive_trends": ["trend1", "trend2"],
  "action_items": [
    {
      "action": "Specific action to take",
      "assigned_team": "team name (e.g., Product, Support, Delivery)",
      "priority": "low|medium|high"
    }
  ]
}

Focus on:
1. Recurring complaints or issues
2. Product quality concerns
3. Delivery or service problems
4. Feature requests
5. Positive feedback patterns`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            emerging_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  severity: { type: "string" },
                  frequency: { type: "number" },
                  examples: { type: "array", items: { type: "string" } }
                }
              }
            },
            product_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: ["string", "null"] },
                  product_name: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            positive_trends: { type: "array", items: { type: "string" } },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  assigned_team: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create analysis record
      const newAnalysis = await base44.entities.FeedbackAnalysis.create({
        analysis_date: new Date().toISOString(),
        sources_analyzed: ["reviews", "chatbot"],
        emerging_issues: analysis.emerging_issues || [],
        product_improvements: analysis.product_improvements || [],
        positive_trends: analysis.positive_trends || [],
        action_items: analysis.action_items || [],
        notified_teams: []
      });

      // Notify admin about critical issues
      const criticalIssues = analysis.emerging_issues?.filter(i => i.severity === 'critical') || [];
      if (criticalIssues.length > 0) {
        const currentUser = await base44.auth.me();
        await base44.entities.Notification.create({
          user_id: currentUser.id,
          title: "⚠️ Critical Issues Detected",
          message: `${criticalIssues.length} critical issues identified in customer feedback`,
          type: "warning"
        });
      }

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Analysis Complete",
        message: "Customer feedback analysis has been completed",
        type: "success"
      });

      loadAnalyses();
    } catch (error) {
      console.error("Error running analysis:", error);
      alert("Failed to run analysis");
    }
    setIsAnalyzing(false);
  };

  const notifyTeam = async (analysis, teamName) => {
    try {
      const admins = await base44.entities.User.filter({ role: 'admin' });
      
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          title: `Action Required: ${teamName} Team`,
          message: `New feedback analysis has identified issues for ${teamName} team. Please review.`,
          type: "info"
        });
      }

      const updatedTeams = [...(analysis.notified_teams || []), teamName];
      await base44.entities.FeedbackAnalysis.update(analysis.id, {
        notified_teams: updatedTeams
      });

      loadAnalyses();
    } catch (error) {
      console.error("Error notifying team:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Feedback Analysis
          </h2>
          <p className="text-gray-600">Automated analysis of customer feedback and insights</p>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run New Analysis
            </>
          )}
        </Button>
      </div>

      {analyses.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No analyses yet. Run your first analysis to get insights.</p>
            <Button onClick={runAnalysis} className="bg-purple-600 hover:bg-purple-700">
              Run Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        analyses.map(analysis => (
          <Card key={analysis.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Analysis from {new Date(analysis.created_date).toLocaleDateString()}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    Sources: {analysis.sources_analyzed?.join(', ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Emerging Issues */}
              {analysis.emerging_issues && analysis.emerging_issues.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Emerging Issues ({analysis.emerging_issues.length})
                  </h3>
                  <div className="space-y-3">
                    {analysis.emerging_issues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium">{issue.issue}</p>
                          <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Frequency: {issue.frequency} mentions</p>
                        {issue.examples && issue.examples.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Example: "{issue.examples[0]}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Improvements */}
              {analysis.product_improvements && analysis.product_improvements.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Product Improvements ({analysis.product_improvements.length})
                  </h3>
                  <div className="space-y-3">
                    {analysis.product_improvements.map((improvement, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium">{improvement.product_name}</p>
                          <Badge className={improvement.priority === 'high' ? 'bg-red-600' : improvement.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'}>
                            {improvement.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{improvement.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Trends */}
              {analysis.positive_trends && analysis.positive_trends.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Positive Trends
                  </h3>
                  <div className="space-y-2">
                    {analysis.positive_trends.map((trend, idx) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg text-sm">
                        ✓ {trend}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {analysis.action_items && analysis.action_items.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Bell className="w-5 h-5 text-blue-600" />
                    Action Items
                  </h3>
                  <div className="space-y-3">
                    {analysis.action_items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.action}</p>
                            <p className="text-xs text-gray-600 mt-1">Assigned to: {item.assigned_team} Team</p>
                          </div>
                          <Badge className={item.priority === 'high' ? 'bg-red-600' : 'bg-blue-600'}>
                            {item.priority}
                          </Badge>
                        </div>
                        {!analysis.notified_teams?.includes(item.assigned_team) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => notifyTeam(analysis, item.assigned_team)}
                            className="mt-2"
                          >
                            <Bell className="w-3 h-3 mr-1" />
                            Notify {item.assigned_team} Team
                          </Button>
                        )}
                        {analysis.notified_teams?.includes(item.assigned_team) && (
                          <Badge variant="outline" className="mt-2 bg-green-50 text-green-700">
                            ✓ Team Notified
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}