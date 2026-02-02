import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import ProductCard from "./ProductCard";

export default function RecommendationEngine({ user, onAddToCart, getCartQuantity, context = "shop" }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const allSettings = await base44.entities.RecommendationSettings.list();
      const config = allSettings.length > 0 ? allSettings[0] : {
        strategy: "ai_powered",
        use_purchase_history: true,
        use_browsing_behavior: true,
        use_loyalty_tier: true,
        max_recommendations: 8,
        boost_high_margin: true
      };
      setSettings(config);
      loadRecommendations(config);
    } catch (error) {
      console.error("Error loading settings:", error);
      loadRecommendations(null);
    }
  };

  const loadRecommendations = async (config) => {
    setIsLoading(true);
    try {
      const useAI = config?.strategy === "ai_powered";
      
      if (useAI) {
        await loadAIRecommendations(config);
      } else {
        await loadBasicRecommendations(config);
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
    setIsLoading(false);
  };

  const loadAIRecommendations = async (config) => {
    try {
      const orders = config?.use_purchase_history ? await base44.entities.Order.filter({ user_id: user.id }) : [];
      const viewedProducts = config?.use_browsing_behavior ? JSON.parse(localStorage.getItem(`viewed_products_${user.id}`) || "[]") : [];
      const allProducts = await base44.entities.Product.filter({ is_available: true });
      
      // Build user context
      const purchasedProducts = [];
      const categoryFrequency = {};
      
      orders.forEach(order => {
        order.items?.forEach(item => {
          purchasedProducts.push(item.product_name);
          const product = allProducts.find(p => p.id === item.product_id);
          if (product) {
            categoryFrequency[product.category_id] = (categoryFrequency[product.category_id] || 0) + 1;
          }
        });
      });

      const recentlyViewed = viewedProducts.slice(0, 5).map(pid => 
        allProducts.find(p => p.id === pid)?.name
      ).filter(Boolean);

      const userTier = config?.use_loyalty_tier ? (user.loyalty_tier || "Bronze") : null;

      // Call AI for recommendations
      const prompt = `You are a product recommendation AI for CollegeCart grocery delivery.

User Profile:
- Loyalty Tier: ${userTier || "Not available"}
- Purchase History: ${purchasedProducts.slice(-10).join(", ") || "No previous purchases"}
- Recently Viewed: ${recentlyViewed.join(", ") || "None"}
- Selected Hostel: ${user.selected_hostel || "Not specified"}

Available Products:
${allProducts.map(p => `- ${p.name} (₹${p.price}, Category: ${p.category_id}, Margin: ${p.profit_margin || 0}%)`).slice(0, 50).join("\n")}

Context: ${context === "shop" ? "Main shop page" : context === "checkout" ? "Checkout page" : "Product detail page"}

Instructions:
- Recommend ${config?.max_recommendations || 8} products that match user preferences
- Consider purchase history and browsing patterns
${config?.use_loyalty_tier ? `- Tier-based: ${userTier === "Platinum" || userTier === "Gold" ? "Premium products" : "Value products"}` : ""}
${config?.boost_high_margin ? "- Prioritize products with profit margin > 15%" : ""}
${config?.boost_new_products ? "- Include newly added products" : ""}
- Only recommend available products
- Diversify across categories
- Avoid recently purchased items

Return ONLY a JSON array of product names: ["Product Name 1", "Product Name 2", ...]`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const recommendedNames = aiResponse.recommendations || [];
      const recommendedProducts = recommendedNames
        .map(name => allProducts.find(p => p.name === name))
        .filter(Boolean)
        .slice(0, context === "checkout" ? 4 : (config?.max_recommendations || 8));

      setRecommendations(recommendedProducts);
    } catch (error) {
      console.error("AI recommendation failed, falling back to basic:", error);
      await loadBasicRecommendations(config);
    }
  };

  const loadBasicRecommendations = async (config) => {
    try {
      const orders = config?.use_purchase_history ? await base44.entities.Order.filter({ user_id: user.id }) : [];
      const viewedProducts = config?.use_browsing_behavior ? JSON.parse(localStorage.getItem(`viewed_products_${user.id}`) || "[]") : [];
      const allProducts = await base44.entities.Product.filter({ is_available: true });
      
      const purchasedProductIds = new Set();
      const categoryFrequency = {};
      
      orders.forEach(order => {
        order.items?.forEach(item => {
          purchasedProductIds.add(item.product_id);
          const product = allProducts.find(p => p.id === item.product_id);
          if (product) {
            categoryFrequency[product.category_id] = (categoryFrequency[product.category_id] || 0) + 1;
          }
        });
      });

      const topCategories = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([categoryId]) => categoryId);

      const scoredProducts = allProducts.map(product => {
        let score = 0;
        
        if (purchasedProductIds.has(product.id)) score -= 100;
        if (topCategories.includes(product.category_id)) score += 30;
        
        const viewIndex = viewedProducts.indexOf(product.id);
        if (viewIndex !== -1) score += 20 - viewIndex;
        
        if (product.rating >= 4) score += 15;
        if (config?.boost_high_margin && product.profit_margin > 20) score += 10;
        if (product.original_price && product.original_price > product.price) score += 8;

        return { ...product, score };
      });

      const topRecommendations = scoredProducts
        .sort((a, b) => b.score - a.score)
        .filter(p => p.score > 0)
        .slice(0, context === "checkout" ? 4 : (config?.max_recommendations || 8));

      setRecommendations(topRecommendations);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
  };

  if (!user || recommendations.length === 0) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600 text-xs sm:text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {context === "checkout" ? "You May Also Like" : "Recommended For You"}
        </h2>
        {settings?.strategy === "ai_powered" && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">AI Powered</span>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <p className="text-sm text-gray-600 mb-4">
          {settings?.strategy === "ai_powered" 
            ? "✨ Personalized recommendations powered by AI"
            : "📦 Handpicked products based on your preferences"}
        </p>
        <div className="relative -mx-1">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1">
            {recommendations.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-32 sm:w-36 snap-start">
                <ProductCard
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onAddToCart={() => onAddToCart(product)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}