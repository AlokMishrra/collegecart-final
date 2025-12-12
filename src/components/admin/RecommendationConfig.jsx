import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Save, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RecommendationConfig() {
  const [settings, setSettings] = useState({
    strategy: "ai_powered",
    use_purchase_history: true,
    use_browsing_behavior: true,
    use_loyalty_tier: true,
    ai_model_temperature: 0.7,
    max_recommendations: 8,
    boost_high_margin: true,
    boost_new_products: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await base44.entities.RecommendationSettings.list();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allSettings = await base44.entities.RecommendationSettings.list();
      
      if (allSettings.length > 0) {
        await base44.entities.RecommendationSettings.update(allSettings[0].id, settings);
      } else {
        await base44.entities.RecommendationSettings.create(settings);
      }

      await base44.entities.Notification.create({
        user_id: (await base44.auth.me()).id,
        title: "Settings Saved",
        message: "Recommendation settings have been updated successfully",
        type: "success"
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Recommendation Configuration
          </h2>
          <p className="text-gray-600">Configure how product recommendations are generated for customers</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Strategy Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendation Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Strategy Type</Label>
              <Select value={settings.strategy} onValueChange={(value) => setSettings({...settings, strategy: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_powered">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      AI Powered (Recommended)
                    </div>
                  </SelectItem>
                  <SelectItem value="collaborative">Collaborative Filtering</SelectItem>
                  <SelectItem value="content_based">Content-Based</SelectItem>
                  <SelectItem value="hybrid">Hybrid Approach</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                {settings.strategy === "ai_powered" && "Uses AI to analyze patterns and generate personalized recommendations"}
                {settings.strategy === "collaborative" && "Based on similar users' preferences"}
                {settings.strategy === "content_based" && "Based on product similarities"}
                {settings.strategy === "hybrid" && "Combines multiple strategies"}
              </p>
            </div>

            <div>
              <Label>Maximum Recommendations</Label>
              <Select 
                value={settings.max_recommendations.toString()} 
                onValueChange={(value) => setSettings({...settings, max_recommendations: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 products</SelectItem>
                  <SelectItem value="6">6 products</SelectItem>
                  <SelectItem value="8">8 products</SelectItem>
                  <SelectItem value="10">10 products</SelectItem>
                  <SelectItem value="12">12 products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.strategy === "ai_powered" && (
              <div>
                <Label>AI Creativity Level: {settings.ai_model_temperature}</Label>
                <Slider
                  value={[settings.ai_model_temperature]}
                  onValueChange={([value]) => setSettings({...settings, ai_model_temperature: value})}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="purchase_history">Purchase History</Label>
                <p className="text-xs text-gray-600">Use past orders to predict preferences</p>
              </div>
              <Switch
                id="purchase_history"
                checked={settings.use_purchase_history}
                onCheckedChange={(checked) => setSettings({...settings, use_purchase_history: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="browsing_behavior">Browsing Behavior</Label>
                <p className="text-xs text-gray-600">Track product views and interactions</p>
              </div>
              <Switch
                id="browsing_behavior"
                checked={settings.use_browsing_behavior}
                onCheckedChange={(checked) => setSettings({...settings, use_browsing_behavior: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="loyalty_tier">Loyalty Tier</Label>
                <p className="text-xs text-gray-600">Personalize based on customer tier</p>
              </div>
              <Switch
                id="loyalty_tier"
                checked={settings.use_loyalty_tier}
                onCheckedChange={(checked) => setSettings({...settings, use_loyalty_tier: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Boosting Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendation Boosting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="high_margin">High Profit Margin Products</Label>
                <p className="text-xs text-gray-600">Prioritize products with better margins</p>
              </div>
              <Switch
                id="high_margin"
                checked={settings.boost_high_margin}
                onCheckedChange={(checked) => setSettings({...settings, boost_high_margin: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="new_products">New Products</Label>
                <p className="text-xs text-gray-600">Boost newly added products</p>
              </div>
              <Switch
                id="new_products"
                checked={settings.boost_new_products}
                onCheckedChange={(checked) => setSettings({...settings, boost_new_products: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600">Strategy: {settings.strategy}</Badge>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>✓ Showing {settings.max_recommendations} recommendations</p>
              {settings.use_purchase_history && <p>✓ Using purchase history</p>}
              {settings.use_browsing_behavior && <p>✓ Tracking browsing behavior</p>}
              {settings.use_loyalty_tier && <p>✓ Personalizing by loyalty tier</p>}
              {settings.boost_high_margin && <p>✓ Boosting high-margin products</p>}
              {settings.boost_new_products && <p>✓ Boosting new products</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}