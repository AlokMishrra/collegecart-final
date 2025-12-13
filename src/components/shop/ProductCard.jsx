import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Truck, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductCard({ product, cartQuantity, onAddToCart, onUpdateQuantity, hostelStock: propHostelStock, isInStock }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  
  const hostelStock = propHostelStock !== undefined ? propHostelStock : product.stock_quantity || 0;

  useEffect(() => {
    loadReviews();
    checkWishlistStatus();
  }, [product.id]);

  const checkWishlistStatus = async () => {
    try {
      const currentUser = await User.me();
      const wishlistItems = await base44.entities.Wishlist.filter({
        user_id: currentUser.id,
        product_id: product.id
      });
      setIsInWishlist(wishlistItems.length > 0);
    } catch (error) {
      // User not logged in
    }
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAddingToWishlist(true);
    try {
      const currentUser = await User.me();
      
      if (isInWishlist) {
        const wishlistItems = await base44.entities.Wishlist.filter({
          user_id: currentUser.id,
          product_id: product.id
        });
        if (wishlistItems[0]) {
          await base44.entities.Wishlist.delete(wishlistItems[0].id);
          setIsInWishlist(false);
          await base44.entities.Notification.create({
            user_id: currentUser.id,
            title: "Removed from Wishlist",
            message: `${product.name} removed from wishlist`,
            type: "info"
          });
        }
      } else {
        await base44.entities.Wishlist.create({
          user_id: currentUser.id,
          product_id: product.id
        });
        setIsInWishlist(true);
        await base44.entities.Notification.create({
          user_id: currentUser.id,
          title: "Added to Wishlist",
          message: `${product.name} added to wishlist`,
          type: "success"
        });
      }
    } catch (error) {
      if (error.message?.includes("not authenticated")) {
        await User.login();
      }
    } finally {
      setIsAddingToWishlist(false);
    }
  };

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
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-2xl">
      <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300";
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20">
              <Badge className="bg-red-500 text-white text-sm px-4 py-2">
                OUT OF STOCK
              </Badge>
            </div>
          )}
          {!isOutOfStock && discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg text-xs px-3 py-1">
              {discount}% OFF
            </Badge>
          )}
          {!isOutOfStock && hostelStock < 5 && hostelStock > 0 && (
            <Badge className="absolute top-3 right-3 bg-orange-500 text-white shadow-lg text-xs px-3 py-1 animate-pulse">
              Only {hostelStock} left
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleWishlist}
            disabled={isAddingToWishlist}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full w-8 h-8"
          >
            <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>
          {reviewCount > 0 && avgRating >= 4 && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-lg">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-gray-900">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4 space-y-3">
        <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
          <h3 className="font-bold text-base mb-1 line-clamp-2 hover:text-emerald-600 transition-colors leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through">₹{product.original_price}</span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">/{product.unit}</span>
        </div>

        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(avgRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-600">({reviewCount})</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-600">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
              <Clock className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="font-medium">{product.delivery_time || "40 mins"}</span>
          </div>
          {product.available_from && product.available_to && (
            <div className="text-emerald-600 font-semibold">
              {product.available_from}-{product.available_to}
            </div>
          )}
        </div>

        {isOutOfStock ? (
          <Button
            size="sm"
            disabled
            className="w-full bg-gray-400 text-white cursor-not-allowed rounded-xl h-10 font-semibold"
          >
            OUT OF STOCK
          </Button>
        ) : cartQuantity > 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                if (onUpdateQuantity) {
                  onUpdateQuantity(product, -1);
                }
              }}
              className="flex-1 hover:bg-emerald-100 rounded-lg h-9 font-bold text-emerald-700"
            >
              −
            </Button>
            <div className="flex items-center justify-center min-w-[2.5rem]">
              <span className="font-bold text-emerald-700">{cartQuantity}</span>
            </div>
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg h-9 font-bold"
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
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl h-10 font-semibold shadow-md hover:shadow-lg transition-all"
          >
            ADD TO CART
          </Button>
        )}
      </CardContent>
    </Card>
  );
}