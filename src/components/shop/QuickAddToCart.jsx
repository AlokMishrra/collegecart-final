import React from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickAddToCart({ cartItems }) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-auto"
    >
      <Link to={createPageUrl('Cart')}>
        <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-lg h-14 px-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs bg-white text-emerald-600">
                {totalItems}
              </Badge>
            </div>
            <div className="text-left">
              <p className="font-semibold">View Cart</p>
              <p className="text-sm opacity-90">{totalItems} items</p>
            </div>
          </div>
        </Button>
      </Link>
    </motion.div>
  );
}