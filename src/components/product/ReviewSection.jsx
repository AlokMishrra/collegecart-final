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

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    try {
      const allReviews = await base44.entities.Review.filter({ product_id: productId }, '-created_date');
      setReviews(allReviews);
      
      if (user) {
        const userReview = allReviews.find(r => r.user_id === user.id);
        setUserHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const submitReview = async () => {
    if (!rating || !user) return;

    setIsSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: productId,
        user_id: user.id,
        user_name: user.full_name || user.email,
        rating,
        comment: comment.trim()
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
          {user && !userHasReviewed && (
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