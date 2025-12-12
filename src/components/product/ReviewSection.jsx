import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function ReviewSection({ productId, user }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState(null);

  useEffect(() => {
    loadReviews();
    checkIfCanReview();
  }, [productId, user]);

  const checkIfCanReview = async () => {
    if (!user) {
      setCanReview(false);
      return;
    }

    try {
      // Check if user has any delivered orders with this product
      const userOrders = await base44.entities.Order.filter({ 
        user_id: user.id, 
        status: "delivered" 
      });

      const hasProductInDeliveredOrder = userOrders.find(order => 
        order.items?.some(item => item.product_id === productId)
      );

      setCanReview(!!hasProductInDeliveredOrder);
      if (hasProductInDeliveredOrder) {
        setDeliveredOrderId(hasProductInDeliveredOrder.id);
      }
    } catch (error) {
      console.error("Error checking if user can review:", error);
      setCanReview(false);
    }
  };

  const loadReviews = async () => {
    try {
      // Get all reviews for this product
      const allReviews = await base44.entities.Review.filter({ product_id: productId }, '-created_date');
      
      // Filter to only include reviews from delivered orders
      const reviewsWithOrders = await Promise.all(
        allReviews.map(async (review) => {
          if (!review.order_id) return null;
          
          try {
            const orders = await base44.entities.Order.filter({ id: review.order_id });
            const order = orders[0];
            return order?.status === "delivered" ? review : null;
          } catch (error) {
            return null;
          }
        })
      );
      
      const validReviews = reviewsWithOrders.filter(r => r !== null);
      setReviews(validReviews);
      
      if (user) {
        const userReview = validReviews.find(r => r.user_id === user.id);
        setUserHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const submitReview = async () => {
    if (!rating || !user || !deliveredOrderId) return;

    setIsSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: productId,
        user_id: user.id,
        user_name: user.full_name || user.email,
        rating,
        comment: comment.trim(),
        order_id: deliveredOrderId
      });

      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Review Submitted",
        message: "Thank you for your review!",
        type: "success"
      });

      setRating(0);
      setComment("");
      loadReviews();
      checkIfCanReview();
    } catch (error) {
      console.error("Error submitting review:", error);
    }
    setIsSubmitting(false);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Reviews</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold">{averageRating}</span>
              <span className="text-gray-500">({reviews.length} reviews)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Write Review */}
          {user && !userHasReviewed && canReview && (
            <div className="border-b pb-6">
              <h3 className="font-semibold mb-3">Write a Review</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Your Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Your Review (Optional)</label>
                  <Textarea
                    placeholder="Share your experience with this product..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={submitReview}
                  disabled={!rating || isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          )}

          {user && !canReview && !userHasReviewed && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 text-sm">You can only review products after your order has been delivered</p>
            </div>
          )}

          {userHasReviewed && user && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-800 text-sm">✓ You've already reviewed this product</p>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            <AnimatePresence>
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.user_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {reviews.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}