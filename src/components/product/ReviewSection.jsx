import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Star, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import ReviewForm from "./ReviewForm";

export default function ReviewSection({ productId, product }) {
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [userHasPurchased, setUserHasPurchased] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  useEffect(() => {
    loadReviews();
    checkUserPurchase();
  }, [productId]);

  const checkUserPurchase = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Check if user has purchased this product
      const userOrders = await base44.entities.Order.filter({
        user_id: currentUser.id,
        status: "delivered"
      });

      const hasPurchased = userOrders.some(order =>
        order.items?.some(item => item.product_id === productId)
      );
      setUserHasPurchased(hasPurchased);

      // Check if user already reviewed
      const userReviews = await base44.entities.Review.filter({
        user_id: currentUser.id,
        product_id: productId
      });
      setUserHasReviewed(userReviews.length > 0);
    } catch (error) {
      // User not logged in
    }
  };

  const loadReviews = async () => {
    try {
      // Only show approved reviews
      const productReviews = await base44.entities.Review.filter(
        { product_id: productId, is_approved: true },
        '-created_date'
      );
      setReviews(productReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Review Form - Only for users who purchased */}
      {user && userHasPurchased && !userHasReviewed && (
        <ReviewForm
          product={product}
          user={user}
          onReviewSubmitted={() => {
            setUserHasReviewed(true);
            loadReviews();
          }}
        />
      )}

      {user && userHasPurchased && userHasReviewed && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              Thank you for your review! It's awaiting approval.
            </p>
          </CardContent>
        </Card>
      )}

      {user && !userHasPurchased && !userHasReviewed && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm text-orange-800">
              You can only review products after your order has been delivered
            </p>
          </CardContent>
        </Card>
      )}

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
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}