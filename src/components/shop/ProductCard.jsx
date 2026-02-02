import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Truck, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductCard({ product, cartQuantity, onAddToCart, onUpdateQuantity, hostelStock: propHostelStock, isInStock, userHostel }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  
  const hostelStock = propHostelStock !== undefined ? propHostelStock : product.stock_quantity || 0;
  const displayPrice = product.price;

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
      const reviewData = await base44.entities.Review.filter({ product_id: product.id }, '-created_date', 10).catch(() => []);
      
      // Skip order validation for performance - trust the data
      setReviews(reviewData);
      setReviewCount(reviewData.length);
      
      if (reviewData.length > 0) {
        const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0);
        setAvgRating(totalRating / reviewData.length);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      setReviews([]);
      setReviewCount(0);
      setAvgRating(0);
    }
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - displayPrice) / product.original_price) * 100)
    : 0;

  const isOutOfStock = isInStock !== undefined ? !isInStock : hostelStock === 0;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 bg-white rounded-xl border border-gray-200">
      <Link to={createPageUrl(`ProductDetails?id=${product.id}`)} className="block">
        <div className="relative overflow-hidden aspect-square">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300";
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20">
              <Badge className="bg-red-500 text-white text-xs px-3 py-1">
                OUT OF STOCK
              </Badge>
            </div>
          )}
          {!isOutOfStock && discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5">
              {discount}% OFF
            </Badge>
          )}
          {!isOutOfStock && hostelStock < 5 && hostelStock > 0 && (
            <Badge className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5">
              {hostelStock} left
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleWishlist}
            disabled={isAddingToWishlist}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7"
          >
            <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>
        </div>
      </Link>

      <CardContent className="p-3 space-y-2">
        <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-emerald-600 transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">₹{displayPrice}</span>
            {product.original_price && product.original_price > displayPrice && (
              <span className="text-xs text-gray-400 line-through">₹{product.original_price}</span>
            )}
          </div>
        </div>

        {reviewCount > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-gray-900">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({reviewCount})</span>
          </div>
        )}

        {isOutOfStock ? (
          <Button
            size="sm"
            disabled
            className="w-full bg-gray-400 text-white cursor-not-allowed rounded-lg h-8 text-xs font-semibold"
          >
            OUT OF STOCK
          </Button>
        ) : cartQuantity > 0 ? (
          <div className="flex items-center gap-1 bg-emerald-50 rounded-lg p-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                if (onUpdateQuantity) {
                  onUpdateQuantity(product, -1);
                }
              }}
              className="flex-1 hover:bg-emerald-100 rounded h-7 font-bold text-emerald-700 text-base"
            >
              −
            </Button>
            <div className="flex items-center justify-center min-w-[2rem]">
              <span className="font-bold text-emerald-700 text-sm">{cartQuantity}</span>
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded h-7 font-bold text-base"
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-lg h-8 text-xs font-semibold"
          >
            ADD TO CART
          </Button>
        )}
      </CardContent>
    </Card>
  );
}