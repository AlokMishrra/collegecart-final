import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function RecommendedProducts({ onAddToCart, cartItems, amountNeededForFreeDelivery }) {
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    loadRecommendedProducts();
  }, [cartItems, amountNeededForFreeDelivery]);

  const loadRecommendedProducts = async () => {
    try {
      // Get categories from current cart items
      const cartProductIds = cartItems.map(item => item.product_id);
      const cartProducts = await Promise.all(
        cartProductIds.map(id => base44.entities.Product.filter({ id }).then(results => results[0]))
      );
      const cartCategoryIds = [...new Set(cartProducts.map(p => p?.category_id).filter(Boolean))];

      // Get all products
      const allProducts = await base44.entities.Product.filter(
        { is_available: true },
        '-profit_margin'
      );
      
      let filtered;
      
      // If user needs specific amount for free delivery, recommend products at or near that price
      if (amountNeededForFreeDelivery && amountNeededForFreeDelivery > 0) {
        // Get products within ±5 of the needed amount, prioritizing exact matches
        filtered = allProducts.filter(p => 
          !cartProductIds.includes(p.id) &&
          Math.abs(p.price - amountNeededForFreeDelivery) <= 5
        ).sort((a, b) => {
          const diffA = Math.abs(a.price - amountNeededForFreeDelivery);
          const diffB = Math.abs(b.price - amountNeededForFreeDelivery);
          return diffA - diffB;
        }).slice(0, 4);
        
        // If not enough products found in that range, add more from same categories
        if (filtered.length < 4) {
          const additional = allProducts.filter(p => 
            cartCategoryIds.includes(p.category_id) &&
            p.profit_margin > 0 &&
            !cartProductIds.includes(p.id) &&
            !filtered.find(f => f.id === p.id)
          ).slice(0, 4 - filtered.length);
          
          filtered = [...filtered, ...additional];
        }
      } else {
        // Show all recommended products with higher profit from same categories
        filtered = allProducts.filter(p => 
          cartCategoryIds.includes(p.category_id) &&
          p.profit_margin > 0 &&
          !cartProductIds.includes(p.id)
        ).slice(0, 4);
      }
      
      setRecommendedProducts(filtered);
    } catch (error) {
      console.error("Error loading recommended products:", error);
    }
  };

  if (recommendedProducts.length === 0) return null;

  return (
    <Card className="mt-2 sm:mt-4 border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
      <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-emerald-800 text-xs sm:text-sm">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="flex-1 truncate">
            {amountNeededForFreeDelivery > 0 
              ? `Add ₹${amountNeededForFreeDelivery.toFixed(0)} for FREE Delivery!`
              : 'Recommended'}
          </span>
          <Badge className="bg-emerald-600 text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">
            {amountNeededForFreeDelivery > 0 ? 'Match' : 'Deals'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {recommendedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-2 bg-white p-2 rounded border border-emerald-100 hover:shadow-md transition-all"
            >
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"}
                alt={product.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded flex-shrink-0"
                onError={(e) => e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[10px] sm:text-xs text-gray-900 mb-0.5 line-clamp-1">
                  {product.name}
                </h4>
                <p className="text-emerald-600 font-bold text-xs sm:text-sm">
                  ₹{product.price}
                  <span className="text-[9px] sm:text-xs text-gray-500">/{product.unit}</span>
                </p>
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  className="mt-1 bg-emerald-600 hover:bg-emerald-700 w-full h-6 text-[10px] sm:text-xs"
                >
                  Add
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}