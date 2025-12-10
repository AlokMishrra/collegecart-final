import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Package, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function DeliveryNotifications({ deliveryPersonEmail }) {
  const [newOrders, setNewOrders] = useState([]);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!deliveryPersonEmail) return;

    // Initialize audio
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRQ0PVqzn77BdGAg+ltryxnYpBSh+y/Hbl0IIElyw6OyrWBMJQJzb8sByJAYogM3z3YwzCBxqvO7mnU0RD1am4/G1ZBsIOpPY88p5LAUngMz03YxACBVasu3qqlkcCz6Y2vPGcygEKIHM9N+RPA0VXrTp7K5aGAo7lNfyz3srBiZ7yPLekUULEVuu6uuuXRcKPJXY88dxJgQoh9Dy3I9AChRds+rqqlwaDD6V1/PGcCcEJ37M9d6PQQ0VXbTo665dGQs7ldfy0H0sCA==");

    const checkForNewOrders = async () => {
      try {
        const availableOrders = await base44.entities.Order.filter({
          status: "confirmed"
        });
        
        const unassignedOrders = availableOrders.filter(order => !order.delivery_person_id);
        
        // Check if there are new orders
        if (unassignedOrders.length > lastOrderCount && lastOrderCount !== 0) {
          const newOrdersOnly = unassignedOrders.slice(lastOrderCount);
          setNewOrders(prev => [...newOrdersOnly, ...prev].slice(0, 5)); // Keep only last 5
          
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }
        }
        
        setLastOrderCount(unassignedOrders.length);
      } catch (error) {
        console.error("Error checking orders:", error);
      }
    };

    // Check immediately
    checkForNewOrders();

    // Then check every 3 seconds for faster updates
    const interval = setInterval(checkForNewOrders, 3000);

    return () => clearInterval(interval);
  }, [deliveryPersonEmail, lastOrderCount]);

  const dismissOrder = (orderId) => {
    setNewOrders(prev => prev.filter(order => order.id !== orderId));
  };

  return (
    <div className="fixed top-20 right-4 z-50 w-80 space-y-2">
      <AnimatePresence>
        {newOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-2xl border-0">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">New Order!</h3>
                      <p className="text-sm text-blue-100">#{order.order_number}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissOrder(order.id)}
                    className="text-white/80 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-xl">₹{order.total_amount.toFixed(2)}</p>
                  <p className="text-blue-100">{order.delivery_address}</p>
                  <p className="text-blue-100">📞 {order.phone_number}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-blue-100 animate-pulse">
                    🔔 Check Delivery Dashboard to accept!
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}