import React from "react";
import { ShoppingBag } from "lucide-react";

export default function EnhancedShopHero() {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2 lg:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base lg:text-xl font-bold text-gray-900 leading-tight">CollegeCart</h1>
              <p className="text-[10px] lg:text-xs text-gray-500 leading-tight">Grocery Delivery</p>
            </div>
          </div>

          {/* Delivery Info - Desktop & Tablet */}
          <div className="hidden md:flex items-center flex-shrink-0">
            <div className="text-left">
              <p className="text-xs lg:text-sm font-bold text-gray-900 leading-tight">Delivery in 30 minutes</p>
              <p className="text-[10px] lg:text-xs text-gray-600 leading-tight">Fast & Fresh to your hostel</p>
            </div>
          </div>

          {/* Features - Desktop */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 flex-1 justify-end">
            <div className="bg-emerald-50 border border-emerald-200 rounded-full px-3 xl:px-4 py-1 xl:py-1.5">
              <span className="text-[11px] xl:text-xs font-semibold text-emerald-700">🚚 Free Delivery ₹500+</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-full px-3 xl:px-4 py-1 xl:py-1.5">
              <span className="text-[11px] xl:text-xs font-semibold text-blue-700">⚡ 30 Min Delivery</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-full px-3 xl:px-4 py-1 xl:py-1.5">
              <span className="text-[11px] xl:text-xs font-semibold text-purple-700">✨ 100% Fresh</span>
            </div>
          </div>

          {/* Features - Mobile & Tablet */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700">🚚 Free ₹500+</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
              <span className="text-[10px] sm:text-xs font-semibold text-blue-700">⚡ 30 Min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}