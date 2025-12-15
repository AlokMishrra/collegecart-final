import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BannerCarousel() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000); // Auto-rotate every 5 seconds

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const loadBanners = async () => {
    try {
      const allBanners = await base44.entities.Banner.filter({ is_active: true }, 'display_order');
      
      // Filter to only show active banners within date range
      const now = new Date();
      const activeBanners = allBanners.filter(banner => {
        if (banner.start_date && new Date(banner.start_date) > now) return false;
        if (banner.end_date && new Date(banner.end_date) < now) return false;
        return true;
      });

      setBanners(activeBanners);
      
      // Track views for all visible banners
      if (activeBanners.length > 0) {
        activeBanners.forEach(banner => {
          base44.entities.Banner.update(banner.id, {
            view_count: (banner.view_count || 0) + 1
          }).catch(err => console.error("Error tracking view:", err));
        });
      }
    } catch (error) {
      console.error("Error loading banners:", error);
    }
    setIsLoading(false);
  };

  const handleBannerClick = async (banner) => {
    try {
      // Track click
      await base44.entities.Banner.update(banner.id, {
        click_count: (banner.click_count || 0) + 1
      });

      // Navigate based on link type
      if (banner.link_type === "internal" && banner.link_target) {
        navigate(createPageUrl(banner.link_target));
      } else if (banner.link_type === "category" && banner.link_target) {
        navigate(createPageUrl("CategoryProducts") + `?id=${banner.link_target}`);
      } else if (banner.link_type === "product" && banner.link_target) {
        navigate(createPageUrl("ProductDetails") + `?id=${banner.link_target}`);
      } else if (banner.link_type === "external" && banner.link_target) {
        window.open(banner.link_target, "_blank");
      }
    } catch (error) {
      console.error("Error handling banner click:", error);
    }
  };

  const nextBanner = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (isLoading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          onClick={() => handleBannerClick(currentBanner)}
          className="cursor-pointer relative h-48 md:h-64 lg:h-72"
          style={{
            backgroundColor: currentBanner.background_color || "#10b981"
          }}
        >
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay with title and description */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
            <div className="p-8 max-w-2xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: currentBanner.text_color || "#ffffff" }}
              >
                {currentBanner.title}
              </motion.h2>
              {currentBanner.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg md:text-xl"
                  style={{ color: currentBanner.text_color || "#ffffff" }}
                >
                  {currentBanner.description}
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4"
              >
                <Button
                  className="bg-white text-gray-900 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick(currentBanner);
                  }}
                >
                  Shop Now
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevBanner}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white w-8"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}