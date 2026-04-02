import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function ComboSection({ onAddComboToCart }) {
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    base44.entities.Combo.filter({ is_active: true }, 'display_order', 20)
      .then(setCombos)
      .catch(() => {});
  }, []);

  if (combos.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Best Value Combos</h2>
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">🔥 Save More</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos.map((combo, idx) => {
          const savings = combo.original_price ? (combo.original_price - combo.price) : 0;
          return (
            <motion.div
              key={combo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {combo.image_url && (
                    <img src={combo.image_url} alt={combo.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Badge className="bg-yellow-500 text-white text-xs mb-1">⭐ BEST VALUE</Badge>
                      <h3 className="font-bold text-gray-900">{combo.name}</h3>
                    </div>
                  </div>
                  {combo.description && (
                    <p className="text-xs text-gray-600 mb-2">{combo.description}</p>
                  )}
                  {combo.product_names?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {combo.product_names.map((name, i) => (
                        <span key={i} className="text-[10px] bg-white border border-yellow-200 rounded-full px-2 py-0.5 text-gray-700">{name}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-emerald-600">₹{combo.price}</span>
                      {combo.original_price && (
                        <span className="text-sm text-gray-400 line-through ml-2">₹{combo.original_price}</span>
                      )}
                      {savings > 0 && (
                        <p className="text-xs text-green-600 font-semibold">Save ₹{savings.toFixed(0)}!</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => onAddComboToCart && onAddComboToCart(combo)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}