import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function ProductCard({ product, cartQuantity, onAddToCart }) {
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    loadRating();
  }, [product.id]);

  const loadRating = async () => {
    try {
      const reviews = await base44.entities.Review.filter({ product_id: product.id });
      setReviewCount(reviews.length);
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  };

  const discountPercentage = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
        <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
          <div className="relative overflow-hidden">
            <img
              src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"}
              alt={product.name}
              className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300";
              }}
            />
            {discountPercentage > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                {discountPercentage}% OFF
              </Badge>
            )}
            {product.stock_quantity < 10 && product.stock_quantity > 0 && (
              <Badge variant="outline" className="absolute top-2 right-2 bg-white">
                Only {product.stock_quantity} left
              </Badge>
            )}
            <Badge variant="outline" className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm">
              ⏱️ {product.delivery_time || "40 mins"}
            </Badge>
          </div>
        </Link>
        
        <CardContent className="p-4 flex flex-col justify-between h-40">
          <div>
            <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-emerald-600 transition-colors">
                {product.name}
              </h3>
            </Link>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-emerald-600">
                ₹{product.price}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-sm text-gray-400 line-through">
                  ₹{product.original_price}
                </span>
              )}
              <span className="text-xs text-gray-500">/{product.unit}</span>
            </div>
            
            {reviewCount > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({reviewCount})</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                {product.stock_quantity} in stock
              </Badge>
            </div>
            {product.stock_quantity === 0 ? (
              <Button disabled className="w-full">
                Out of Stock
              </Button>
            ) : cartQuantity > 0 ? (
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-semibold px-3">{cartQuantity}</span>
                <Button
                  size="icon"
                  className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={onAddToCart}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={onAddToCart}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}