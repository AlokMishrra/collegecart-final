import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProductCard from "../components/shop/ProductCard";

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      await loadWishlist(currentUser.id);
      await loadCartItems(currentUser.id);
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
  };

  const loadWishlist = async (userId) => {
    setIsLoading(true);
    try {
      const wishlist = await base44.entities.Wishlist.filter({ user_id: userId });
      setWishlistItems(wishlist);

      if (wishlist.length > 0) {
        const productIds = wishlist.map(item => item.product_id);
        const productPromises = productIds.map(id => 
          base44.entities.Product.filter({ id })
        );
        const productResults = await Promise.all(productPromises);
        const loadedProducts = productResults.flat().filter(p => p.is_available);
        setProducts(loadedProducts);
      }
    } catch (error) {
      console.error("Error loading wishlist:", error);
    }
    setIsLoading(false);
  };

  const loadCartItems = async (userId) => {
    try {
      const items = await base44.entities.CartItem.filter({ user_id: userId });
      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const item = wishlistItems.find(w => w.product_id === productId);
      if (item) {
        await base44.entities.Wishlist.delete(item.id);
        await base44.entities.Notification.create({
          user_id: user.id,
          title: "Removed from Wishlist",
          message: "Product removed from your wishlist",
          type: "info"
        });
        loadWishlist(user.id);
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const addToCart = async (product) => {
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

  const updateCartQuantity = async (product, quantityChange) => {
    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityChange;
        
        if (newQuantity <= 0) {
          await base44.entities.CartItem.delete(existingItem.id);
        } else {
          await base44.entities.CartItem.update(existingItem.id, {
            quantity: newQuantity
          });
        }
      }

      loadCartItems(user.id);
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const getHostelStock = (product) => {
    if (!user?.selected_hostel || user.selected_hostel === 'Other') {
      return product.stock_quantity || 0;
    }
    return product.hostel_stock?.[user.selected_hostel] || 0;
  };

  const isProductInStock = (product) => {
    const hostelStock = getHostelStock(product);
    return hostelStock > 0;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Heart className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
        <p className="text-gray-600 mb-8">Save your favorite products to buy them later!</p>
        <Button
          onClick={() => navigate(createPageUrl('Shop'))}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Start Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-gray-600">{products.length} {products.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeFromWishlist(product.id)}
                className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm hover:bg-red-50 rounded-full"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
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
    </div>
  );
}