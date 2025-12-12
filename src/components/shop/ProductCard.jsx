import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductCard({ product, cartQuantity, onAddToCart, onUpdateQuantity, hostelStock: propHostelStock, isInStock }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  
  const hostelStock = propHostelStock !== undefined ? propHostelStock : product.stock_quantity || 0;

  useEffect(() => {
    loadReviews();
  }, [product.id]);

  const loadReviews = async () => {
    try {
      const reviewData = await base44.entities.Review.filter({ product_id: product.id });
      
      // Filter to only include reviews from delivered orders
      const validReviews = [];
      for (const review of reviewData) {
        if (review.order_id) {
          try {
            const orders = await base44.entities.Order.filter({ id: review.order_id });
            if (orders[0]?.status === "delivered") {
              validReviews.push(review);
            }
          } catch (error) {
            console.error("Error checking order status:", error);
          }
        }
      }
      
      setReviews(validReviews);
      setReviewCount(validReviews.length);
      
      if (validReviews.length > 0) {
        const totalRating = validReviews.reduce((sum, review) => sum + review.rating, 0);
        setAvgRating(totalRating / validReviews.length);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isOutOfStock = isInStock !== undefined ? !isInStock : hostelStock === 0;

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
      <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
        <div className="relative">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"}
            alt={product.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300";
            }}
          />
          {isOutOfStock && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              OUT OF STOCK
            </Badge>
          )}
          {!isOutOfStock && discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              {discount}% OFF
            </Badge>
          )}
          {!isOutOfStock && hostelStock < 5 && hostelStock > 0 && (
            <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
              Only {hostelStock} left
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-emerald-600">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
          {product.original_price && (
            <span className="text-sm text-gray-400 line-through">₹{product.original_price}</span>
          )}
          <span className="text-xs text-gray-500">/{product.unit}</span>
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({reviewCount})</span>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{product.delivery_time || "40 mins"}</span>
          </div>
          {product.available_from && product.available_to && (
            <div className="text-xs text-emerald-600 font-medium">
              Available: {product.available_from} - {product.available_to}
            </div>
          )}
        </div>

        {isOutOfStock ? (
          <Button
            size="sm"
            disabled
            className="w-full bg-red-500 text-white cursor-not-allowed"
          >
            OUT OF STOCK
          </Button>
        ) : cartQuantity > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                if (onUpdateQuantity) {
                  onUpdateQuantity(product, -1);
                }
              }}
              className="flex-1"
            >
              -
            </Button>
            <span className="font-semibold px-3">{cartQuantity}</span>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                if (onUpdateQuantity) {
                  onUpdateQuantity(product, 1);
                } else {
                  onAddToCart(product);
                }
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              +
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart(product);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            ADD
          </Button>
        )}
      </CardContent>
    </Card>
  );
}