import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "../components/shop/ProductCard";

export default function CategoryProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    loadData();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      loadCartItems(currentUser.id);
    } catch (error) {
      // User not logged in
    }
  };

  const loadCartItems = async (userId) => {
    try {
      const items = await base44.entities.CartItem.filter({ user_id: userId });
      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  const isProductAvailableNow = (product) => {
    if (!product.available_from || !product.available_to) return true;
    
    try {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = currentHours * 60 + currentMinutes;
      
      const fromParts = product.available_from.split(':');
      const fromTime = parseInt(fromParts[0], 10) * 60 + parseInt(fromParts[1] || '0', 10);
      
      const toParts = product.available_to.split(':');
      const toTime = parseInt(toParts[0], 10) * 60 + parseInt(toParts[1] || '0', 10);
      
      return currentTime >= fromTime && currentTime <= toTime;
    } catch (error) {
      return true;
    }
  };

  const getHostelStock = (product) => {
    if (!user?.selected_hostel || user.selected_hostel === 'Other') {
      return product.stock_quantity || 0;
    }
    if (product.hostel_stock && typeof product.hostel_stock[user.selected_hostel] === 'number') {
      return product.hostel_stock[user.selected_hostel];
    }
    return product.stock_quantity || 0;
  };

  const isProductInStock = (product) => {
    if (!isProductAvailableNow(product)) {
      return false;
    }
    const hostelStock = getHostelStock(product);
    return hostelStock > 0;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const categoryId = urlParams.get('categoryId');
      const categoryNameParam = urlParams.get('categoryName');
      
      setCategoryName(categoryNameParam || "Products");

      if (categoryId) {
        const productsData = await base44.entities.Product.filter({
          category_id: categoryId,
          is_available: true
        }, '-created_date');
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
    setIsLoading(false);
  };

  const addToCart = async (product) => {
    if (!user) {
      await base44.auth.redirectToLogin();
      return;
    }

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        await base44.entities.CartItem.update(existingItem.id, {
          quantity: existingItem.quantity + 1
        });
      } else {
        await base44.entities.CartItem.create({
          product_id: product.id,
          user_id: user.id,
          quantity: 1
        });
      }

      await base44.entities.Notification.create({
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl('Shop'))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
            <p className="text-gray-600">{products.length} products available</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-48 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onAddToCart={() => addToCart(product)}
                  hostelStock={getHostelStock(product)}
                  isInStock={isProductInStock(product)}
                  userHostel={user?.selected_hostel}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}