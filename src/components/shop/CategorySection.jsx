import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";

export default function CategorySection({ category, products, onAddToCart, onUpdateQuantity, getCartQuantity }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      // User not logged in
    }
  };

  const getHostelStock = (product) => {
    if (!user?.selected_hostel || user.selected_hostel === 'Other') {
      return product.stock_quantity || 0;
    }
    // Check if hostel_stock exists and has a value for this hostel (even if 0)
    if (product.hostel_stock && product.hostel_stock.hasOwnProperty(user.selected_hostel)) {
      return product.hostel_stock[user.selected_hostel];
    }
    return product.stock_quantity || 0;
  };
  
  // Show all categories even if empty
  if (!products || products.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
        </div>
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">No products available in this category</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
        <Link 
          to={createPageUrl(`CategoryProducts?categoryId=${category.id}&categoryName=${category.name}`)}
          className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          see all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {products.slice(0, 10).map((product, index) => {
            const cartQty = getCartQuantity(product.id);
            const hasDiscount = product.original_price && product.original_price > product.price;
            const hostelStock = getHostelStock(product);
            const isOutOfStock = hostelStock === 0;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0 w-40 snap-start"
              >
                <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 overflow-hidden">
                    <div className="relative">
                      <img
                        src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200"}
                        alt={product.name}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200";
                        }}
                      />
                      {product.delivery_charge === 0 && (
                        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                          Free Delivery
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">{product.delivery_time || "13 mins"}</span>
                      </div>

                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 h-10">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">{product.unit}</p>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">₹{product.price}</span>
                            {hasDiscount && (
                              <span className="text-xs text-gray-400 line-through">
                                ₹{product.original_price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isOutOfStock ? (
                        <Button
                          size="sm"
                          disabled
                          className="w-full bg-red-500 text-white cursor-not-allowed h-8 text-xs font-semibold"
                        >
                          OUT OF STOCK
                        </Button>
                      ) : cartQty > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-2 py-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (onUpdateQuantity) {
                                onUpdateQuantity(product, -1);
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center text-emerald-600 font-bold"
                          >
                            -
                          </button>
                          <span className="font-semibold text-emerald-600">{cartQty}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (onUpdateQuantity) {
                                onUpdateQuantity(product, 1);
                              } else {
                                onAddToCart(product);
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center text-emerald-600 font-bold"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            onAddToCart(product);
                          }}
                          size="sm"
                          className="w-full bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white h-8 text-xs font-semibold"
                        >
                          ADD
                        </Button>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}