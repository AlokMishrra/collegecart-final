import React from "react";
import { motion } from "framer-motion";
import { Truck, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DeliveryProgressBar({ subtotal, settings, isFirstOrder }) {
  if (!settings) return null;

  const threshold = isFirstOrder ? settings.first_order_threshold : settings.free_delivery_above;
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const remaining = Math.max(threshold - subtotal, 0);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-sm">
              {progress >= 100 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  Free Delivery Unlocked!
                </span>
              ) : (
                <span className="text-gray-700">
                  {isFirstOrder && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mr-2">
                      First Order Offer!
                    </span>
                  )}
                  Add ₹{remaining.toFixed(0)} more for FREE delivery
                </span>
              )}
            </span>
          </div>
        </div>
        
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full ${progress >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
          />
        </div>

        {isFirstOrder && progress < 100 && (
          <p className="text-xs text-blue-600 mt-2">
            🎉 First order special: Free delivery on orders above ₹{settings.first_order_threshold}!
          </p>
        )}
      </CardContent>
    </Card>
  );
}