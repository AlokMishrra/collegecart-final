import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ThumbsUp, Loader2 } from "lucide-react";

export default function AIKnowledgeBase({ currentContext }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [currentContext]);

  const loadSuggestions = async () => {
    try {
      const articles = await base44.entities.KnowledgeArticle.filter({ 
        is_published: true,
        category: currentContext 
      }, '-view_count', 3);
      setSuggestions(articles);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  const searchKnowledge = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const articles = await base44.entities.KnowledgeArticle.filter({ is_published: true });

      const prompt = `Answer this question using the knowledge base:

QUESTION: ${query}

KNOWLEDGE BASE:
${articles.map(a => `[${a.category}] ${a.title}: ${a.content.substring(0, 200)}`).join('\n')}

Provide:
1. Clear, concise answer
2. Relevant article references
3. Step-by-step if applicable

Return JSON:
{
  "answer": "string",
  "relevant_articles": ["article_id1", "article_id2"],
  "confidence": <0-100>
}`;

      const aiAnswer = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            relevant_articles: { type: "array", items: { type: "string" } },
            confidence: { type: "number" }
          }
        }
      });

      const relevantArticles = articles.filter(a => 
        aiAnswer.relevant_articles?.includes(a.id)
      );

      setAnswer({
        ...aiAnswer,
        articles: relevantArticles
      });
    } catch (error) {
      console.error("Error searching knowledge:", error);
    }
    setIsSearching(false);
  };

  const markHelpful = async (articleId) => {
    try {
      const article = await base44.entities.KnowledgeArticle.filter({ id: articleId });
      if (article[0]) {
        await base44.entities.KnowledgeArticle.update(articleId, {
          helpful_count: (article[0].helpful_count || 0) + 1
        });
      }
    } catch (error) {
      console.error("Error marking helpful:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            AI Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchKnowledge()}
              placeholder="Ask anything about the platform..."
            />
            <Button onClick={searchKnowledge} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {answer && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-blue-900">Answer</p>
                <Badge className="bg-blue-600">{answer.confidence}% confident</Badge>
              </div>
              <p className="text-sm text-gray-700 mb-3">{answer.answer}</p>
              {answer.articles?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">Related articles:</p>
                  {answer.articles.map(article => (
                    <div key={article.id} className="flex items-center justify-between p-2 bg-white rounded mb-1">
                      <span className="text-sm">{article.title}</span>
                      <Button size="sm" variant="ghost" onClick={() => markHelpful(article.id)}>
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suggested for You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map(article => (
                <div key={article.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <p className="font-medium text-sm">{article.title}</p>
                  <p className="text-xs text-gray-600">{article.content.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}