import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex gap-3 pb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectCategory(null)}
          className={cn(
            "px-6 py-3 rounded-full font-medium whitespace-nowrap transition-all flex-shrink-0 snap-start",
            !selectedCategory
              ? "bg-emerald-600 text-white shadow-lg"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}
        >
          All
        </motion.button>
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-medium whitespace-nowrap transition-all flex-shrink-0 snap-start",
              selectedCategory === category.id
                ? "bg-emerald-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            )}
          >
            {category.image_url && (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            {category.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}