import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function RecommendedProducts({ onAddToCart }) {
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    loadRecommendedProducts();
  }, []);

  const loadRecommendedProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.filter(
        { is_available: true },
        '-profit_margin'
      );
      // Get top 4 products with highest profit margin
      setRecommendedProducts(allProducts.filter(p => p.profit_margin > 0).slice(0, 4));
    } catch (error) {
      console.error("Error loading recommended products:", error);
    }
  };

  if (recommendedProducts.length === 0) return null;

  return (
    <Card className="mt-6 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-800">
          <Sparkles className="w-5 h-5" />
          Recommended for You
          <Badge className="ml-auto bg-emerald-600">Best Deals</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 bg-white p-3 rounded-lg border border-emerald-100 hover:shadow-md transition-all"
            >
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-lg"
                onError={(e) => e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"}
              />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
                  {product.name}
                </h4>
                <p className="text-emerald-600 font-bold text-lg">
                  ₹{product.price}
                  <span className="text-xs text-gray-500">/{product.unit}</span>
                </p>
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 w-full"
                >
                  Add to Cart
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}