import React from "react";
import { ShoppingBag } from "lucide-react";

export default function EnhancedShopHero() {
  return (
    <div className="bg-white border-b border-gray-200 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 mb-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-gray-900">CollegeCart</h1>
            <p className="text-xs text-gray-500">Grocery Delivery</p>
          </div>
        </div>

        {/* Delivery Info - Hidden on mobile */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Delivery in 30 minutes</p>
            <p className="text-xs text-gray-600">Fast & Fresh to your hostel</p>
          </div>
        </div>

        {/* Features - Centered badges */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
            <span className="text-xs font-semibold text-emerald-700">🚚 Free Delivery ₹500+</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5">
            <span className="text-xs font-semibold text-blue-700">⚡ 30 Min Delivery</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-full px-4 py-1.5">
            <span className="text-xs font-semibold text-purple-700">✨ 100% Fresh</span>
          </div>
        </div>

        {/* Mobile features */}
        <div className="flex md:hidden items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-emerald-700">🚚 Free ₹500+</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-blue-700">⚡ 30 Min</span>
          </div>
        </div>
      </div>
    </div>
  );
}