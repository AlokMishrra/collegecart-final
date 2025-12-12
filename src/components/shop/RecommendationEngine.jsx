import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import ProductCard from "./ProductCard";

export default function RecommendationEngine({ user, onAddToCart, getCartQuantity, context = "shop" }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      // Get user's order history
      const orders = await base44.entities.Order.filter({ user_id: user.id });
      
      // Get viewed products from localStorage
      const viewedProducts = JSON.parse(localStorage.getItem(`viewed_products_${user.id}`) || "[]");
      
      // Get all products
      const allProducts = await base44.entities.Product.filter({ is_available: true });
      
      // Extract product IDs from orders
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

      // Get frequently purchased categories
      const topCategories = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([categoryId]) => categoryId);

      // Recommendation algorithm
      const scoredProducts = allProducts.map(product => {
        let score = 0;
        
        // Don't recommend recently purchased products
        if (purchasedProductIds.has(product.id)) {
          score -= 100;
        }
        
        // Boost products from frequently purchased categories
        if (topCategories.includes(product.category_id)) {
          score += 30;
        }
        
        // Boost recently viewed products
        const viewIndex = viewedProducts.indexOf(product.id);
        if (viewIndex !== -1) {
          score += 20 - viewIndex; // More recent views get higher scores
        }
        
        // Boost high-rated products
        if (product.rating >= 4) {
          score += 15;
        }
        
        // Boost products with good profit margins
        if (product.profit_margin > 20) {
          score += 10;
        }
        
        // Boost products with discounts
        if (product.original_price && product.original_price > product.price) {
          score += 8;
        }
        
        // Check hostel stock availability
        if (user.selected_hostel && user.selected_hostel !== 'Other') {
          const hostelStock = product.hostel_stock?.[user.selected_hostel] || 0;
          if (hostelStock === 0) {
            score -= 50; // Heavily penalize out of stock
          }
        }

        return { ...product, score };
      });

      // Sort by score and take top recommendations
      const topRecommendations = scoredProducts
        .sort((a, b) => b.score - a.score)
        .filter(p => p.score > 0)
        .slice(0, context === "checkout" ? 4 : 8);

      setRecommendations(topRecommendations);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
    setIsLoading(false);
  };

  if (!user || isLoading || recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-900">
          {context === "checkout" ? "You May Also Like" : "Recommended For You"}
        </h2>
      </div>
      
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Based on your preferences and purchase history
          </p>
          <div className={`grid gap-4 ${
            context === "checkout" 
              ? "grid-cols-2 lg:grid-cols-4" 
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          }`}>
            {recommendations.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getCartQuantity(product.id)}
                onAddToCart={() => onAddToCart(product)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}