import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { Search, Filter, ShoppingCart, Plus, Minus, Building2, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import QuickAddToCart from "../components/shop/QuickAddToCart";
  import EnhancedShopHero from "../components/shop/EnhancedShopHero";
  import CategorySection from "../components/shop/CategorySection";
  import CategoryFilter from "../components/shop/CategoryFilter";
  import ProductCard from "../components/shop/ProductCard";
  import HostelSelector from "../components/shop/HostelSelector";
  import RecommendationEngine from "../components/shop/RecommendationEngine";
  import EnhancedSearch from "../components/shop/EnhancedSearch";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [categorizedProducts, setCategorizedProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showHostelSelector, setShowHostelSelector] = useState(false);
  const [filters, setFilters] = useState({
    availability: "all",
    rating: "all",
    priceRange: [0, 1000]
  });
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    checkUser();
    loadData();
  }, []);

  useEffect(() => {
    // Categorize products
    const categorized = {};
    categories.forEach(category => {
      categorized[category.id] = products.filter(p => p.category_id === category.id);
    });
    setCategorizedProducts(categorized);
  }, [products, categories]);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Check if user has selected hostel
      if (!currentUser.selected_hostel) {
        setShowHostelSelector(true);
      }
      
      loadCartItems(currentUser.id);
    } catch (error) {
      // User not logged in
    }
  };

  const handleHostelSelected = (hostel) => {
    setShowHostelSelector(false);
    setUser(prev => ({ ...prev, selected_hostel: hostel }));
    loadData();
  };

  const isProductAvailableNow = (product) => {
    if (!product.available_from || !product.available_to) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [fromHour, fromMin] = product.available_from.split(':').map(Number);
    const [toHour, toMin] = product.available_to.split(':').map(Number);
    
    const fromTime = fromHour * 60 + fromMin;
    const toTime = toHour * 60 + toMin;
    
    return currentTime >= fromTime && currentTime <= toTime;
  };

  const getHostelStock = (product) => {
    if (!user?.selected_hostel) {
      return product.stock_quantity || 0;
    }
    return product.hostel_stock?.[user.selected_hostel] || product.stock_quantity || 0;
  };

  const isProductInStock = (product) => {
    const hostelStock = getHostelStock(product);
    return hostelStock > 0;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, currentUser] = await Promise.all([
        Product.filter({ is_available: true }, '-created_date'),
        Category.filter({ is_active: true }, 'display_order'),
        User.me().catch(() => null)
      ]);

      // Filter products based on time availability only
      let filteredProducts = productsData.filter(product => {
        // Check time availability
        if (!isProductAvailableNow(product)) return false;

        // Show all products regardless of hostel
        return true;
      });

      setProducts(filteredProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const loadCartItems = async (userId) => {
    try {
      const items = await CartItem.filter({ user_id: userId });
      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  const updateCartQuantity = async (product, quantityChange) => {
    if (!user) {
      await User.login();
      return;
    }

    // Check hostel stock before adding
    if (quantityChange > 0 && !isProductInStock(product)) {
      await Notification.create({
        user_id: user.id,
        title: "Out of Stock",
        message: `${product.name} is currently out of stock in your hostel`,
        type: "error"
      });
      return;
    }

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      const hostelStock = getHostelStock(product);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityChange;
        
        // Check if new quantity exceeds hostel stock
        if (newQuantity > hostelStock) {
          await Notification.create({
            user_id: user.id,
            title: "Stock Limit Reached",
            message: `Only ${hostelStock} units available in your hostel`,
            type: "warning"
          });
          return;
        }
        
        if (newQuantity <= 0) {
          await CartItem.delete(existingItem.id);
        } else {
          await CartItem.update(existingItem.id, {
            quantity: newQuantity
          });
        }
      } else if (quantityChange > 0) {
        await CartItem.create({
          product_id: product.id,
          user_id: user.id,
          quantity: 1
        });
      }

      if (quantityChange > 0) {
        await Notification.create({
          user_id: user.id,
          title: "Added to Cart",
          message: `${product.name} has been added to your cart`,
          type: "success"
        });
      }

      loadCartItems(user.id);
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const addToCart = async (product) => {
    await updateCartQuantity(product, 1);
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const applyFiltersAndSort = (productList) => {
    let filtered = [...productList];

    // Apply search
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(" ");
      filtered = filtered.filter(p => {
        const text = `${p.name} ${p.description || ""}`.toLowerCase();
        return terms.some(term => text.includes(term));
      });
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    // Apply price range filter
    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Apply availability filter
    if (filters.availability === "in_stock") {
      filtered = filtered.filter(p => {
        if (user?.selected_hostel && user.selected_hostel !== 'Other') {
          return (p.hostel_stock?.[user.selected_hostel] || 0) > 0;
        }
        return p.stock_quantity > 0;
      });
    }

    // Apply rating filter
    if (filters.rating !== "all") {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(p => (p.average_rating || 0) >= minRating);
    }

    // Apply sorting
    switch (sortBy) {
      case "price_low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
      default:
        // relevance - keep original order
        break;
    }

    return filtered;
  };

  const filteredProducts = applyFiltersAndSort(products);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      {/* Hostel Selector Modal */}
      {showHostelSelector && <HostelSelector onHostelSelected={handleHostelSelected} />}
      
      {/* Enhanced Header */}
      <EnhancedShopHero />

      {/* Change Hostel Button */}
      {user?.selected_hostel && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Delivering to</p>
              <p className="text-sm font-semibold text-gray-900">
                {user.selected_hostel} Hostel
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHostelSelector(true)}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-full px-4"
          >
            Change
          </Button>
        </motion.div>
      )}

      {/* Enhanced Search */}
      <EnhancedSearch
        products={products}
        onSearch={setSearchQuery}
        filters={filters}
        onFilterChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Personalized Recommendations */}
      {!searchQuery.trim() && !selectedCategory && filters.availability === "all" && filters.rating === "all" && user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RecommendationEngine 
            user={user} 
            onAddToCart={addToCart}
            getCartQuantity={getCartQuantity}
            context="shop"
          />
        </motion.div>
      )}

      {/* Category Sections */}
      {isLoading ? (
        <div className="space-y-10">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-10 w-64 mb-6 rounded-xl" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array(5).fill(0).map((_, j) => (
                  <Skeleton key={j} className="h-80 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery.trim() || selectedCategory || filters.availability !== "all" || filters.rating !== "all" || sortBy !== "relevance" ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your filters or search terms</p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Found <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard
                        product={product}
                        cartQuantity={getCartQuantity(product.id)}
                        onAddToCart={addToCart}
                        onUpdateQuantity={updateCartQuantity}
                        hostelStock={getHostelStock(product)}
                        isInStock={isProductInStock(product)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <div className="space-y-12">
          {categories.filter(category => (categorizedProducts[category.id] || []).length > 0).map((category, idx) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <CategorySection
                category={category}
                products={categorizedProducts[category.id] || []}
                onAddToCart={addToCart}
                onUpdateQuantity={updateCartQuantity}
                getCartQuantity={getCartQuantity}
                getHostelStock={getHostelStock}
                isProductInStock={isProductInStock}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Add to Cart */}
      {user && cartItems.length > 0 && (
        <QuickAddToCart cartItems={cartItems} />
      )}
    </div>
  );
}