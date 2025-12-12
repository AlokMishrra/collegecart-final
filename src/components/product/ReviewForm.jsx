import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewForm({ product, user, order, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: product.id,
        user_id: user.id,
        user_name: user.full_name || "Anonymous",
        rating: rating,
        comment: comment.trim(),
        order_id: order?.id,
        is_approved: false // Requires admin approval
      });

      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Review Submitted",
        message: `Your review for ${product.name} has been submitted and is awaiting moderation.`,
        type: "success"
      });

      // Notify admin
      try {
        const admins = await base44.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          await base44.entities.Notification.create({
            user_id: admin.id,
            title: "New Review Pending",
            message: `${user.full_name} submitted a review for ${product.name}`,
            type: "info"
          });
        }
      } catch (error) {
        console.log("Could not notify admins");
      }

      setRating(0);
      setComment("");
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-50 border border-emerald-200 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
      
      <div className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review (Optional)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Your review will be visible after admin approval
        </p>
      </div>
    </motion.div>
  );
}