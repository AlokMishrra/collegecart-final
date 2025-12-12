import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X } from "lucide-react";
import { motion } from "framer-motion";

export default function FeedbackPopup({ user }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Load reviewed orders from localStorage
    const stored = localStorage.getItem(`reviewed_orders_${user.id}`);
    if (stored) {
      setReviewedOrders(JSON.parse(stored));
    }

    checkForDeliveredOrders();
    const interval = setInterval(checkForDeliveredOrders, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const checkForDeliveredOrders = async () => {
    if (!user) return;

    try {
      const orders = await base44.entities.Order.filter({
        user_id: user.id,
        status: "delivered"
      });

      // Find orders that haven't been reviewed yet
      const stored = localStorage.getItem(`reviewed_orders_${user.id}`);
      const reviewed = stored ? JSON.parse(stored) : [];
      
      const unreviewed = orders.filter(order => !reviewed.includes(order.id));
      
      if (unreviewed.length > 0 && !showFeedback) {
        setCurrentOrder(unreviewed[0]);
        setCurrentProductIndex(0);
        setShowFeedback(true);
      }
    } catch (error) {
      console.error("Error checking delivered orders:", error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!currentOrder || rating === 0) return;

    setSubmitting(true);
    try {
      const currentProduct = currentOrder.items[currentProductIndex];
      
      await base44.entities.Review.create({
        product_id: currentProduct.product_id,
        user_id: user.id,
        user_name: user.full_name || user.email,
        rating: rating,
        comment: comment,
        order_id: currentOrder.id
      });

      // Move to next product or finish
      if (currentProductIndex < currentOrder.items.length - 1) {
        setCurrentProductIndex(currentProductIndex + 1);
        setRating(0);
        setComment("");
      } else {
        // Mark order as reviewed
        const newReviewedOrders = [...reviewedOrders, currentOrder.id];
        setReviewedOrders(newReviewedOrders);
        localStorage.setItem(`reviewed_orders_${user.id}`, JSON.stringify(newReviewedOrders));
        
        setShowFeedback(false);
        setCurrentOrder(null);
        setCurrentProductIndex(0);
        setRating(0);
        setComment("");
        
        // Check for more orders to review
        setTimeout(checkForDeliveredOrders, 1000);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
    setSubmitting(false);
  };

  const handleSkipOrder = () => {
    if (!currentOrder) return;
    
    const newReviewedOrders = [...reviewedOrders, currentOrder.id];
    setReviewedOrders(newReviewedOrders);
    localStorage.setItem(`reviewed_orders_${user.id}`, JSON.stringify(newReviewedOrders));
    
    setShowFeedback(false);
    setCurrentOrder(null);
    setCurrentProductIndex(0);
    setRating(0);
    setComment("");
    
    setTimeout(checkForDeliveredOrders, 1000);
  };

  if (!showFeedback || !currentOrder) return null;

  const currentProduct = currentOrder.items[currentProductIndex];
  const progress = `${currentProductIndex + 1} of ${currentOrder.items.length}`;

  return (
    <Dialog open={showFeedback} onOpenChange={(open) => !open && handleSkipOrder()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Rate Your Order</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkipOrder}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              Product {progress}
            </div>
            <h3 className="font-semibold text-lg">{currentProduct.product_name}</h3>
            <p className="text-sm text-gray-600">Order #{currentOrder.order_number}</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </motion.button>
            ))}
          </div>

          <div>
            <Textarea
              placeholder="Share your experience (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkipOrder}
              className="flex-1"
            >
              Skip All
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={rating === 0 || submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? "Submitting..." : currentProductIndex < currentOrder.items.length - 1 ? "Next" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}