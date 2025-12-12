import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewModeration() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState({});

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const allReviews = await base44.entities.Review.list('-created_date');
      setReviews(allReviews);

      // Load product names
      const productIds = [...new Set(allReviews.map(r => r.product_id))];
      const productPromises = productIds.map(id =>
        base44.entities.Product.filter({ id }).then(results => results[0])
      );
      const productsData = await Promise.all(productPromises);
      
      const productsMap = {};
      productsData.forEach(product => {
        if (product) productsMap[product.id] = product;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
    setIsLoading(false);
  };

  const approveReview = async (reviewId) => {
    try {
      await base44.entities.Review.update(reviewId, { is_approved: true });
      
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        await base44.entities.Notification.create({
          user_id: review.user_id,
          title: "Review Approved",
          message: `Your review for ${products[review.product_id]?.name} has been approved and is now visible.`,
          type: "success"
        });
      }

      loadReviews();
    } catch (error) {
      console.error("Error approving review:", error);
    }
  };

  const rejectReview = async (reviewId) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      
      await base44.entities.Review.delete(reviewId);
      
      if (review) {
        await base44.entities.Notification.create({
          user_id: review.user_id,
          title: "Review Not Approved",
          message: `Your review for ${products[review.product_id]?.name} did not meet our guidelines.`,
          type: "info"
        });
      }

      loadReviews();
    } catch (error) {
      console.error("Error rejecting review:", error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const pendingReviews = reviews.filter(r => !r.is_approved);
  const approvedReviews = reviews.filter(r => r.is_approved);

  return (
    <div className="space-y-6">
      {/* Pending Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Pending Reviews ({pendingReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending reviews</p>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {products[review.product_id]?.name || "Product"}
                      </p>
                      <p className="text-sm text-gray-600">
                        By {review.user_name} • {new Date(review.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      Pending
                    </Badge>
                  </div>

                  <div className="mb-2">{renderStars(review.rating)}</div>

                  {review.comment && (
                    <p className="text-gray-700 mb-4 text-sm">{review.comment}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveReview(review.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectReview(review.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Approved Reviews ({approvedReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedReviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No approved reviews yet</p>
          ) : (
            <div className="space-y-3">
              {approvedReviews.slice(0, 10).map((review) => (
                <div
                  key={review.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {products[review.product_id]?.name || "Product"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {review.user_name} • {new Date(review.created_date).toLocaleDateString()}
                      </p>
                      <div className="mt-1">{renderStars(review.rating)}</div>
                      {review.comment && (
                        <p className="text-gray-700 mt-2 text-sm">{review.comment}</p>
                      )}
                    </div>
                    <Badge className="bg-green-600 text-white">Approved</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}