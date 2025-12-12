import { useEffect } from "react";

export default function ProductViewTracker({ productId, userId }) {
  useEffect(() => {
    if (!productId || !userId) return;

    // Track product view
    const viewedProducts = JSON.parse(localStorage.getItem(`viewed_products_${userId}`) || "[]");
    
    // Remove if already exists and add to front (most recent)
    const filtered = viewedProducts.filter(id => id !== productId);
    const updated = [productId, ...filtered].slice(0, 20); // Keep last 20 views
    
    localStorage.setItem(`viewed_products_${userId}`, JSON.stringify(updated));
  }, [productId, userId]);

  return null;
}