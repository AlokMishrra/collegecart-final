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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, currentUser] = await Promise.all([
        Product.filter({ is_available: true }, '-created_date'),
        Category.filter({ is_active: true }, 'display_order'),
        User.me().catch(() => null)
      ]);
      
      // Filter products based on user's selected hostel
      let filteredProducts = productsData;
      if (currentUser?.selected_hostel && currentUser.selected_hostel !== 'Other') {
        filteredProducts = productsData.filter(product => {
          const hostelStock = product.hostel_stock?.[currentUser.selected_hostel] || 0;
          return hostelStock > 0;
        });
      }
      
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

  const addToCart = async (product) => {
    if (!user) {
      await User.login();
      return;
    }

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        await CartItem.update(existingItem.id, {
          quantity: existingItem.quantity + 1
        });
      } else {
        await CartItem.create({
          product_id: product.id,
          user_id: user.id,
          quantity: 1
        });
      }

      // Create notification
      await Notification.create({
        user_id: user.id,
        title: "Added to Cart",
        message: `${product.name} has been added to your cart`,
        type: "success"
      });

      loadCartItems(user.id);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const displayProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;
    
  const filteredProducts = searchQuery.trim()
    ? displayProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayProducts;

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search for products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 w-full"
        />
      </div>

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

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
      ) : searchQuery.trim() || selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onAddToCart={() => addToCart(product)}
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