import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HostelPromotionBanner({ user }) {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    if (user?.selected_hostel) {
      loadPromotions();
    }
  }, [user]);

  useEffect(() => {
    if (promotions.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % promotions.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [promotions]);

  const loadPromotions = async () => {
    try {
      const now = new Date().toISOString();
      const allPromos = await base44.entities.HostelPromotion.filter({
        is_active: true,
        promotion_type: "banner"
      });

      const validPromos = allPromos.filter(promo => {
        const isDateValid = new Date(promo.start_date) <= new Date(now) && new Date(promo.end_date) >= new Date(now);
        const isHostelMatch = promo.hostel === "All" || promo.hostel === user.selected_hostel;
        const notDismissed = !dismissed.includes(promo.id);
        return isDateValid && isHostelMatch && notDismissed;
      });

      setPromotions(validPromos);
    } catch (error) {
      console.error("Error loading promotions:", error);
    }
  };

  const handleDismiss = (promoId) => {
    setDismissed([...dismissed, promoId]);
    setPromotions(promotions.filter(p => p.id !== promoId));
  };

  if (promotions.length === 0) return null;

  const currentPromo = promotions[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPromo.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative rounded-2xl overflow-hidden shadow-lg mb-6"
      >
        <div className="relative h-48 md:h-64">
          {currentPromo.banner_image ? (
            <img
              src={currentPromo.banner_image}
              alt={currentPromo.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <Tag className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-3xl font-bold mb-2">{currentPromo.title}</h3>
                <p className="text-xl">{currentPromo.description}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDismiss(currentPromo.id)}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {promotions.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? "bg-white w-8" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}