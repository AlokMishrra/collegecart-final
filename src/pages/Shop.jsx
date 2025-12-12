import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { Search, Filter, ShoppingCart, Plus, Minus, Building2 } from "lucide-react";
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, currentUser] = await Promise.all([
        Product.filter({ is_available: true }, '-created_date'),
        Category.filter({ is_active: true }, 'display_order'),
        User.me().catch(() => null)
      ]);
      
      // Filter products based on user's selected hostel and time availability
      let filteredProducts = productsData.filter(product => {
        // Check time availability
        if (!isProductAvailableNow(product)) return false;
        
        // Check hostel stock
        if (currentUser?.selected_hostel && currentUser.selected_hostel !== 'Other') {
          const hostelStock = product.hostel_stock?.[currentUser.selected_hostel] || 0;
          return hostelStock > 0;
        }
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

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityChange;
        
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hostel Selector Modal */}
      {showHostelSelector && <HostelSelector onHostelSelected={handleHostelSelected} />}
      
      {/* Enhanced Header */}
      <EnhancedShopHero />

      {/* Change Hostel Button */}
      {user?.selected_hostel && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-gray-900">
              Showing products for: <span className="text-emerald-600">{user.selected_hostel} Hostel</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHostelSelector(true)}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
          >
            Change Hostel
          </Button>
        </div>
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
        <RecommendationEngine 
          user={user} 
          onAddToCart={addToCart}
          getCartQuantity={getCartQuantity}
          context="shop"
        />
      )}

      {/* Category Sections */}
      {isLoading ? (
        <div className="space-y-8">
          {Array(3).fill(0).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="flex gap-4 overflow-hidden">
                {Array(5).fill(0).map((_, j) => (
                  <Skeleton key={j} className="h-64 w-40 flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery.trim() || selectedCategory || filters.availability !== "all" || filters.rating !== "all" || sortBy !== "relevance" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onAddToCart={addToCart}
                  onUpdateQuantity={updateCartQuantity}
                />
              ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <CategorySection
              key={category.id}
              category={category}
              products={categorizedProducts[category.id] || []}
              onAddToCart={addToCart}
              onUpdateQuantity={updateCartQuantity}
              getCartQuantity={getCartQuantity}
            />
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