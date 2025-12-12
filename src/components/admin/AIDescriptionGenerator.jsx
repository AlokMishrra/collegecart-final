import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AIDescriptionGenerator({ productName, onSelectDescription }) {
  const [keywords, setKeywords] = useState("");
  const [features, setFeatures] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [descriptions, setDescriptions] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateDescriptions = async () => {
    if (!keywords.trim() && !features.trim()) {
      alert("Please enter keywords or features");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Generate 3 product descriptions for: ${productName || "a product"}

Keywords: ${keywords}
Key Features: ${features}
Tone: ${tone}
Length: ${length === "short" ? "2-3 sentences" : length === "medium" ? "4-6 sentences" : "7-10 sentences"}

Requirements:
- SEO-friendly and engaging
- Include keywords naturally
- Highlight key features
- Use ${tone} tone
- Make it compelling for customers
- Focus on benefits

Return as JSON array with format: [{"description": "text", "highlights": ["point1", "point2"]}]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            descriptions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  highlights: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      setDescriptions(result.descriptions || []);
    } catch (error) {
      console.error("Error generating descriptions:", error);
      alert("Failed to generate descriptions");
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold">AI Description Generator</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Keywords (SEO)</Label>
          <Input
            placeholder="organic, fresh, healthy..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        <div>
          <Label>Key Features</Label>
          <Input
            placeholder="100% natural, no preservatives..."
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual & Friendly</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="informative">Informative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Length</Label>
          <Select value={length} onValueChange={setLength}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="long">Long & Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={generateDescriptions}
        disabled={isGenerating}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Descriptions
          </>
        )}
      </Button>

      {descriptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Generated Descriptions:</h4>
          {descriptions.map((item, index) => (
            <Card key={index} className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-purple-600">
                    Variation {index + 1}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(item.description, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onSelectDescription(item.description)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Use This
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                {item.highlights && item.highlights.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-1">Key Points:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside">
                      {item.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}