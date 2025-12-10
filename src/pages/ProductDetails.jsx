import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ShoppingCart, Plus, Minus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductDetails() {
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userReview, setUserReview] = useState({ rating: 5, comment: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    checkUser();
    loadProduct();
  }, []);

  useEffect(() => {
    if (product) {
      loadReviews();
    }
  }, [product]);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      // User not logged in
    }
  };

  const loadProduct = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('id');
      
      if (!productId) {
        navigate(createPageUrl('Shop'));
        return;
      }

      const productData = await Product.filter({ id: productId });
      if (productData.length === 0) {
        navigate(createPageUrl('Shop'));
        return;
      }

      const prod = productData[0];
      setProduct(prod);

      // Load category
      if (prod.category_id) {
        const categoryData = await Category.filter({ id: prod.category_id });
        if (categoryData.length > 0) {
          setCategory(categoryData[0]);
        }
      }

      // Load cart quantity if user is logged in
      if (user) {
        const cartItems = await CartItem.filter({ 
          user_id: user.id, 
          product_id: prod.id 
        });
        if (cartItems.length > 0) {
          setCartQuantity(cartItems[0].quantity);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  };

  const addToCart = async () => {
    if (!user) {
      await User.login();
      return;
    }

    try {
      const existingItems = await CartItem.filter({ 
        user_id: user.id, 
        product_id: product.id 
      });
      
      if (existingItems.length > 0) {
        await CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + 1
        });
        setCartQuantity(existingItems[0].quantity + 1);
      } else {
        await CartItem.create({
          product_id: product.id,
          user_id: user.id,
          quantity: 1
        });
        setCartQuantity(1);
      }

      // Create notification
      await Notification.create({
        user_id: user.id,
        title: "Added to Cart",
        message: `${product.name} has been added to your cart`,
        type: "success"
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const updateQuantity = async (newQuantity) => {
    if (!user || newQuantity < 0) return;

    try {
      const existingItems = await CartItem.filter({ 
        user_id: user.id, 
        product_id: product.id 
      });
      
      if (existingItems.length > 0) {
        if (newQuantity === 0) {
          await CartItem.delete(existingItems[0].id);
        } else {
          await CartItem.update(existingItems[0].id, { quantity: newQuantity });
        }
        setCartQuantity(newQuantity);
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const productReviews = await base44.entities.Review.filter({ product_id: product.id }, '-created_date');
      setReviews(productReviews);
      
      if (productReviews.length > 0) {
        const avg = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const submitReview = async () => {
    if (!user) {
      await User.login();
      return;
    }

    if (!userReview.comment.trim()) {
      await Notification.create({
        user_id: user.id,
        title: "Review Required",
        message: "Please write a comment for your review",
        type: "warning"
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      await base44.entities.Review.create({
        product_id: product.id,
        user_id: user.id,
        user_name: user.full_name || "Anonymous",
        rating: userReview.rating,
        comment: userReview.comment,
        is_verified_purchase: true
      });

      await Notification.create({
        user_id: user.id,
        title: "Review Submitted",
        message: "Thank you for your feedback!",
        type: "success"
      });

      setUserReview({ rating: 5, comment: "" });
      loadReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
    }
    setIsSubmittingReview(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discountPercentage = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl('Shop'))}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Shop
      </Button>

      {/* Product Details */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"}
            alt={product.name}
            className="w-full h-96 object-cover rounded-lg shadow-lg"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500";
            }}
          />
          {discountPercentage > 0 && (
            <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-600">
              {discountPercentage}% OFF
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {category && (
              <Badge variant="outline" className="mb-2">
                {category.name}
              </Badge>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {Array(5).fill(0).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating > 0 ? `${averageRating.toFixed(1)} (${reviews.length} reviews)` : 'No reviews yet'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-emerald-600">
                ₹{product.price}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xl text-gray-400 line-through">
                  ₹{product.original_price}
                </span>
              )}
              <span className="text-lg text-gray-500">/{product.unit}</span>
            </div>
            {product.stock_quantity < 10 && product.stock_quantity > 0 && (
              <p className="text-orange-600 font-medium">
                Only {product.stock_quantity} left in stock!
              </p>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed">
            {product.description || "Fresh and high-quality product delivered straight to your doorstep."}
          </p>

          {/* Add to Cart Section */}
          <Card>
            <CardContent className="p-6">
              {product.stock_quantity === 0 ? (
                <Button disabled className="w-full h-12">
                  Out of Stock
                </Button>
              ) : cartQuantity > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(cartQuantity - 1)}
                      className="h-10 w-10"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-semibold px-4">{cartQuantity}</span>
                    <Button
                      size="icon"
                      onClick={() => updateQuantity(cartQuantity + 1)}
                      className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => navigate(createPageUrl('Cart'))}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Go to Cart
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={addToCart}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Product Features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl mb-2">🚚</div>
              <p className="font-medium">Fast Delivery</p>
              <p className="text-sm text-gray-600">In 10-30 minutes</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl mb-2">🌱</div>
              <p className="font-medium">Fresh & Quality</p>
              <p className="text-sm text-gray-600">Hand-picked products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>

          {/* Write Review */}
          {user && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Rating</label>
                  <div className="flex gap-2">
                    {Array(5).fill(0).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setUserReview({ ...userReview, rating: i + 1 })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 cursor-pointer transition-colors ${
                            i < userReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Review</label>
                  <textarea
                    value={userReview.comment}
                    onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                    placeholder="Share your experience with this product..."
                    className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows="4"
                  />
                </div>
                <Button
                  onClick={submitReview}
                  disabled={isSubmittingReview}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review this product!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{review.user_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {Array(5).fill(0).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-xs">Verified Purchase</Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}