import React from "react";
import { motion } from "framer-motion";
import { Truck, Clock, Shield, Tag } from "lucide-react";

export default function EnhancedShopHero() {
  const features = [
    { icon: Truck, text: "Free Delivery on ₹500+", color: "text-emerald-600" },
    { icon: Clock, text: "Delivered in 30 mins", color: "text-blue-600" },
    { icon: Shield, text: "100% Fresh Products", color: "text-purple-600" },
    { icon: Tag, text: "Best Prices Guaranteed", color: "text-orange-600" }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 rounded-3xl p-8 text-white mb-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Fresh Groceries, Delivered Fast ⚡
          </h1>
          <p className="text-emerald-50 text-lg mb-6">
            Get your daily essentials delivered in minutes, right to your doorstep
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-3"
            >
              <div className="bg-white rounded-lg p-2">
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}