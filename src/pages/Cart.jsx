import React, { useState, useEffect, useCallback } from "react";
import { CartItem } from "@/entities/CartItem";
import { Product } from "@/entities/Product";
import { base44 } from "@/api/base44Client";
  import { User } from "@/entities/User";
  import { Order } from "@/entities/Order";
  import { Notification } from "@/entities/Notification";
  import { DeliveryPerson } from "@/entities/DeliveryPerson";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import DeliveryProgressBar from "../components/cart/DeliveryProgressBar";
import RecommendedProducts from "../components/cart/RecommendedProducts";
import RecommendationEngine from "../components/shop/RecommendationEngine";
import CashfreePayment from "../components/cart/CashfreePayment";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
        const [settings, setSettings] = useState(null);
        const [isFirstOrder, setIsFirstOrder] = useState(false);

        const [customerName, setCustomerName] = useState("");
        const [selectedHostel, setSelectedHostel] = useState("");
        const [roomNumber, setRoomNumber] = useState("");
        const [phoneNumber, setPhoneNumber] = useState("");
        const [deliveryNotes, setDeliveryNotes] = useState("");
        const [customAddress, setCustomAddress] = useState("");
        const [paymentMethod, setPaymentMethod] = useState("cash");
        const [loyaltyPoints, setLoyaltyPoints] = useState(0);
        const [pointsToRedeem, setPointsToRedeem] = useState(0);
        const [discountCode, setDiscountCode] = useState("");
        const [appliedCampaign, setAppliedCampaign] = useState(null);
        const [codeError, setCodeError] = useState("");
        const [selectedDhaba, setSelectedDhaba] = useState({});
        const [razorpayPaymentId, setRazorpayPaymentId] = useState(null);

  const loadCart = useCallback(async (userId) => {
    setIsLoading(true);
    try {
      const items = await CartItem.filter({ user_id: userId }, '-created_date', 50).catch(() => []);
      setCartItems(items);

      if (items.length === 0) {
        setProducts({});
        setIsLoading(false);
        return;
      }

      const productIds = [...new Set(items.map(item => item.product_id))].slice(0, 50);
      const productPromises = productIds.map(id => 
        Product.filter({ id }).then(results => results[0]).catch(() => null)
      );
      const productsData = await Promise.all(productPromises);
      
      const productsMap = {};
      productsData.forEach(product => {
        if (product) productsMap[product.id] = product;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading cart:", error);
      setCartItems([]);
      setProducts({});
    }
    setIsLoading(false);
  }, []); // Dependencies: empty as state setters and static imports are stable.

  const loadSettings = useCallback(async () => {
    try {
      const allSettings = await base44.entities.Settings.list();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  const checkFirstOrder = useCallback(async (userId) => {
    try {
      const userOrders = await Order.filter({ user_id: userId });
      setIsFirstOrder(userOrders.length === 0);
    } catch (error) {
      console.error("Error checking orders:", error);
    }
  }, []);

  const loadLoyaltyPoints = useCallback(async (userId) => {
    try {
      const transactions = await base44.entities.LoyaltyTransaction.filter({ user_id: userId });
      const balance = transactions.reduce((sum, t) => sum + t.points, 0);
      setLoyaltyPoints(balance);
    } catch (error) {
      console.error("Error loading loyalty points:", error);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      loadCart(currentUser.id);
      loadSettings();
      checkFirstOrder(currentUser.id);
      loadLoyaltyPoints(currentUser.id);
      setCustomerName(currentUser.full_name || "");
      setPhoneNumber(currentUser.phone_number || "");
      // Automatically set delivery location from user's selected hostel
      setSelectedHostel(currentUser.selected_hostel || "");
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
  }, [navigate, loadCart, loadSettings, checkFirstOrder, loadLoyaltyPoints]);

  useEffect(() => {
    checkUser();
  }, [checkUser]); // Dependency: checkUser

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      await CartItem.update(itemId, { quantity: newQuantity });
      loadCart(user.id);
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await CartItem.delete(itemId);
      loadCart(user.id);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const getProductPrice = (product) => {
    if (!product) return 0;
    
    // Check if dhaba is selected and product has dhaba options
    if (selectedDhaba[product.id] && product.dhaba_options?.length > 0) {
      const dhabaOption = product.dhaba_options.find(opt => opt.dhaba_name === selectedDhaba[product.id]);
      if (dhabaOption) return dhabaOption.price;
    }
    
    return product.price || 0;
  };

  const hasDhabaProducts = () => {
    return cartItems.some(item => {
      const product = products[item.product_id];
      return product?.dhaba_options?.length > 0;
    });
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = products[item.product_id];
      const price = getProductPrice(product);
      return total + (product ? price * item.quantity : 0);
    }, 0);
  };

  const calculateShippingCharge = () => {
    if (!settings) return 0;
    const subtotal = calculateSubtotal();
    const threshold = isFirstOrder ? settings.first_order_threshold : settings.free_delivery_above;

    if (subtotal >= threshold) return 0;

    // Calculate product-specific delivery charges (sum of all products' charges)
    let totalDeliveryCharge = 0;
    cartItems.forEach(item => {
      const product = products[item.product_id];
      if (product && product.delivery_charge) {
        totalDeliveryCharge += product.delivery_charge;
      }
    });

    // If no product-specific charges, use default shipping charge
    return totalDeliveryCharge > 0 ? totalDeliveryCharge : (settings.shipping_charge || 0);
  };

  const calculatePointsDiscount = () => {
    return pointsToRedeem / 10;
  };

  const calculateCampaignDiscount = () => {
    if (!appliedCampaign) return 0;
    const subtotal = calculateSubtotal();
    if (appliedCampaign.discount_type === 'percentage') {
      return subtotal * (appliedCampaign.discount_value / 100);
    } else if (appliedCampaign.discount_type === 'fixed') {
      return Math.min(appliedCampaign.discount_value, subtotal);
    }
    return 0;
  };

  const calculateTotal = () => {
    let shipping = calculateShippingCharge();
    if (appliedCampaign?.discount_type === 'free_shipping') {
      shipping = 0;
    }
    return Math.max(0, calculateSubtotal() + shipping - calculatePointsDiscount() - calculateCampaignDiscount());
  };

  const applyDiscountCode = async () => {
    setCodeError("");
    if (!discountCode.trim()) return;

    try {
      const campaigns = await base44.entities.Campaign.filter({ 
        code: discountCode.toUpperCase(),
        is_active: true 
      });

      if (campaigns.length === 0) {
        setCodeError("Invalid discount code");
        return;
      }

      const campaign = campaigns[0];
      const now = new Date();
      const start = new Date(campaign.start_date);
      const end = new Date(campaign.end_date);

      if (now < start || now > end) {
        setCodeError("This campaign has expired");
        return;
      }

      if (campaign.usage_limit && campaign.usage_count >= campaign.usage_limit) {
        setCodeError("This code has reached its usage limit");
        return;
      }

      if (calculateSubtotal() < campaign.min_order_amount) {
        setCodeError(`Minimum order of ₹${campaign.min_order_amount} required`);
        return;
      }

      // Check user usage
      const userUsage = await base44.entities.CampaignUsage.filter({
        campaign_id: campaign.id,
        user_id: user.id
      });

      if (userUsage.length >= campaign.usage_per_user) {
        setCodeError("You've already used this code");
        return;
      }

      setAppliedCampaign(campaign);
      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Discount Applied!",
        message: `${campaign.name} discount code applied successfully`,
        type: "success"
      });
    } catch (error) {
      console.error("Error applying code:", error);
      setCodeError("Failed to apply code");
    }
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const addToCart = async (product) => {
    if (!user) {
      await base44.auth.redirectToLogin();
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

      await Notification.create({
        user_id: user.id,
        title: "Added to Cart",
        message: `${product.name} has been added to your cart`,
        type: "success"
      });

      loadCart(user.id);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const placeOrder = async (paymentId = null) => {
      // Check if cart is empty
      if (cartItems.length === 0) {
        await Notification.create({
          user_id: user.id,
          title: "Cart is Empty",
          message: "Please add products to your cart before placing an order.",
          type: "warning"
        });
        return;
      }

      // Validate based on address type
      if (!customerName.trim() || !phoneNumber.trim()) {
        await Notification.create({
          user_id: user.id,
          title: "Missing Information",
          message: "Please fill out name and phone number.",
          type: "warning"
        });
        return;
      }

      if (selectedHostel === "Other") {
        if (!customAddress.trim()) {
          await Notification.create({
            user_id: user.id,
            title: "Missing Address",
            message: "Please enter your delivery address.",
            type: "warning"
          });
          return;
        }
      } else {
        if (!selectedHostel || !roomNumber.trim()) {
          await Notification.create({
            user_id: user.id,
            title: "Missing Information",
            message: "Please select hostel and enter room number.",
            type: "warning"
          });
          return;
        }
      }

      // For online payment, wait for Razorpay payment completion
      if (paymentMethod === "online" && !paymentId) {
        await Notification.create({
          user_id: user.id,
          title: "Complete Payment",
          message: "Please complete the payment using the Razorpay button below.",
          type: "info"
        });
        return;
      }

    // Set loading state immediately
    setIsPlacingOrder(true);

    // Show processing notification immediately for online payments
    if (paymentMethod === "online" && paymentId) {
      await Notification.create({
        user_id: user.id,
        title: "Processing Your Order...",
        message: "Payment successful! Creating your order now...",
        type: "info"
      });
    }
    try {
      const orderNumber = `CC${Date.now()}`;
      const orderItems = cartItems.map(item => {
        const product = products[item.product_id];
        const dhabaName = selectedDhaba[item.product_id];
        return {
          product_id: item.product_id,
          product_name: product?.name || "",
          price: getProductPrice(product) || 0,
          quantity: item.quantity,
          dhaba_name: dhabaName || null
        };
      });
      
      const fullAddress = selectedHostel === "Other" 
        ? customAddress 
        : `${selectedHostel} Hostel, Room No: ${roomNumber}`;

      const finalAmount = calculateTotal();
      
      // Validate stock before creating order (async operations)
      const stockPromises = cartItems.map(async (item) => {
        const product = products[item.product_id];
        if (!product) return { valid: true };

        let availableStock = product.stock_quantity || 0;
        if (user.selected_hostel && user.selected_hostel !== 'Other' && product.hostel_stock) {
          availableStock = product.hostel_stock[user.selected_hostel] || 0;
        }

        if (availableStock < item.quantity) {
          return { 
            valid: false, 
            productName: product.name, 
            availableStock 
          };
        }
        return { valid: true };
      });

      const stockResults = await Promise.all(stockPromises);
      const invalidStock = stockResults.find(result => !result.valid);
      
      if (invalidStock) {
        await Notification.create({
          user_id: user.id,
          title: "Out of Stock",
          message: `${invalidStock.productName} is out of stock. Only ${invalidStock.availableStock} available.`,
          type: "error"
        });
        setIsPlacingOrder(false);
        return;
      }

      const newOrder = await Order.create({
        user_id: user.id,
        order_number: orderNumber,
        customer_name: customerName,
        items: orderItems,
        total_amount: finalAmount,
        delivery_address: fullAddress,
        phone_number: phoneNumber,
        delivery_notes: deliveryNotes,
        status: "confirmed",
        payment_method: paymentMethod,
        is_paid: paymentMethod === "online" ? true : false
      });

      // Reduce stock for each item (parallel operations for speed)
      const stockUpdatePromises = cartItems.map(async (item) => {
        const product = products[item.product_id];
        if (!product) return;

        if (user.selected_hostel && user.selected_hostel !== 'Other' && product.hostel_stock) {
          const currentHostelStock = product.hostel_stock[user.selected_hostel] || 0;
          const updatedHostelStock = {
            ...product.hostel_stock,
            [user.selected_hostel]: Math.max(0, currentHostelStock - item.quantity)
          };
          
          return Product.update(product.id, {
            hostel_stock: updatedHostelStock
          });
        } else {
          const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
          return Product.update(product.id, {
            stock_quantity: newStock
          });
        }
      });

      await Promise.all(stockUpdatePromises);

      // Redeem loyalty points if used
      if (pointsToRedeem > 0) {
        const currentBalance = loyaltyPoints;
        await base44.entities.LoyaltyTransaction.create({
          user_id: user.id,
          points: -pointsToRedeem,
          transaction_type: "redeemed",
          order_id: newOrder.id,
          description: `Redeemed ${pointsToRedeem} points for ₹${calculatePointsDiscount().toFixed(2)} discount on order ${orderNumber}`,
          balance_after: currentBalance - pointsToRedeem
        });
      }

      // Track campaign usage
      if (appliedCampaign) {
        await base44.entities.CampaignUsage.create({
          campaign_id: appliedCampaign.id,
          user_id: user.id,
          order_id: newOrder.id,
          discount_amount: calculateCampaignDiscount(),
          order_amount: finalAmount
        });

        await base44.entities.Campaign.update(appliedCampaign.id, {
          usage_count: (appliedCampaign.usage_count || 0) + 1,
          total_revenue: (appliedCampaign.total_revenue || 0) + finalAmount,
          total_discount_given: (appliedCampaign.total_discount_given || 0) + calculateCampaignDiscount()
        });
      }

      // Notify all delivery persons about new order
      const allDeliveryPersons = await DeliveryPerson.list();
      await Promise.all(
        allDeliveryPersons.map(person => 
          Notification.create({
            user_id: person.email,
            title: "New Order Available!",
            message: `Order #${orderNumber} for ₹${calculateTotal().toFixed(2)} is ready for pickup`,
            type: "info"
          })
        )
      );

      // Send URGENT email notification to store owner about new order
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CollegeCart - URGENT ORDER",
          to: "info@apnafreelancer.in",
          subject: `🚨 URGENT: New Order #${orderNumber} - CALL 7248316506 NOW!`,
          body: `
            <div style="background-color: #fee; border: 3px solid #f00; padding: 20px; border-radius: 10px;">
              <h1 style="color: #f00;">🚨 NEW ORDER RECEIVED!</h1>
              <h2 style="color: #f00;">IMMEDIATE ACTION REQUIRED</h2>
              <p style="font-size: 18px; font-weight: bold;">📞 CALL: 7248316506 NOW TO NOTIFY!</p>
            </div>
            <br/>
            <h2>Order Details:</h2>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Phone:</strong> ${phoneNumber}</p>
            <p><strong>Address:</strong> ${fullAddress}</p>
            <p><strong>Total Amount:</strong> ₹${calculateTotal().toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
            <p><strong>Items:</strong></p>
            <ul>
              ${orderItems.map(item => `<li>${item.product_name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
            </ul>
            <br/>
            <div style="background-color: #ffc; border: 2px solid #fa0; padding: 15px;">
              <p style="font-size: 16px; font-weight: bold;">⚠️ ACTION ITEMS:</p>
              <ol>
                <li>Call 7248316506 immediately</li>
                <li>Confirm order in admin panel</li>
                <li>Assign delivery person</li>
              </ol>
            </div>
          `
        });
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }

      // Clear cart and update user info (parallel)
      await Promise.all([
        ...cartItems.map(item => CartItem.delete(item.id)),
        User.updateMyUserData({
          full_name: customerName,
          phone_number: phoneNumber
        })
      ]);

      // Award loyalty points with tier-based multiplier
      const tierMultipliers = {
        Bronze: 1,
        Silver: 1.5,
        Gold: 2,
        Platinum: 3
      };
      
      const userTier = user.loyalty_tier || "Bronze";
      const basePoints = Math.floor(finalAmount * 0.05);
      const multiplier = tierMultipliers[userTier];
      const pointsEarned = Math.floor(basePoints * multiplier);
      
      // Bonus points for orders above certain amounts
      let bonusPoints = 0;
      if (finalAmount >= 1000) bonusPoints += 50;
      if (finalAmount >= 2000) bonusPoints += 100;
      if (finalAmount >= 3000) bonusPoints += 200;
      
      const totalPointsEarned = pointsEarned + bonusPoints;
      
      await base44.entities.LoyaltyTransaction.create({
        user_id: user.id,
        points: totalPointsEarned,
        transaction_type: "earned",
        order_id: newOrder.id,
        description: bonusPoints > 0 
          ? `Earned ${totalPointsEarned} points (${pointsEarned} base + ${bonusPoints} bonus) from order ${orderNumber}`
          : `Earned ${totalPointsEarned} points from order ${orderNumber} (${multiplier}x ${userTier} multiplier)`,
        balance_after: (loyaltyPoints - pointsToRedeem) + totalPointsEarned
      });

      // Create success notification with sound
      await Notification.create({
        user_id: user.id,
        title: "Order Placed Successfully!",
        message: `Your order ${orderNumber} has been placed! You earned ${totalPointsEarned} loyalty points!`,
        type: "success"
      });

      // Play notification sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch (error) {
        console.log("Could not play notification sound");
      }

      navigate(createPageUrl('Orders'));
    } catch (error) {
      console.error("Error placing order:", error);
      await Notification.create({
        user_id: user.id,
        title: "Order Failed",
        message: "There was an error placing your order. Please try again.",
        type: "error"
      });
    }
    setIsPlacingOrder(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some products to get started!</p>
        <Button
          onClick={() => navigate(createPageUrl('Shop'))}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 sm:px-6 space-y-3 sm:space-y-6">
      {/* Progress Bar at Top */}
      <DeliveryProgressBar 
        subtotal={calculateSubtotal()} 
        settings={settings} 
        isFirstOrder={isFirstOrder}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Cart</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('Shop'))}
          className="h-8 w-8"
        >
          <span className="text-xl">×</span>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-2 sm:space-y-4">
          <AnimatePresence>
            {cartItems.map((item) => {
              const product = products[item.product_id];
              if (!product) return null;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="shadow-sm">
                    <CardContent className="p-2 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <img
                          src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150"}
                          alt={product.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight mb-1">{product.name}</h3>
                          {product.dhaba_options?.length > 0 ? (
                            <div className="mt-1">
                              <Select 
                                value={selectedDhaba[product.id] || ""} 
                                onValueChange={(value) => setSelectedDhaba({ ...selectedDhaba, [product.id]: value })}
                              >
                                <SelectTrigger className="h-6 text-[10px] sm:text-xs">
                                  <SelectValue placeholder="Select Dhaba" />
                                </SelectTrigger>
                                <SelectContent>
                                  {product.dhaba_options.map((option, idx) => (
                                    <SelectItem key={idx} value={option.dhaba_name}>
                                      {option.dhaba_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <p className="text-emerald-600 font-medium text-[10px] sm:text-xs">{product.quantity} × ₹{getProductPrice(product)}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 sm:h-7 sm:w-7 rounded-sm"
                              >
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                              <span className="font-bold px-1.5 sm:px-2 text-xs sm:text-sm min-w-[20px] text-center">{item.quantity}</span>
                              <Button
                                size="icon"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-6 w-6 sm:h-7 sm:w-7 bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                              >
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs sm:text-sm text-gray-900">₹{(getProductPrice(product) * item.quantity).toFixed(0)}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Recommended Products */}
          <RecommendedProducts 
            onAddToCart={addToCart} 
            cartItems={cartItems}
            amountNeededForFreeDelivery={
              settings && calculateShippingCharge() > 0
                ? (isFirstOrder ? settings.first_order_threshold : settings.free_delivery_above) - calculateSubtotal()
                : 0
            }
          />


        </div>

        {/* Order Summary */}
        <div className="space-y-3 sm:space-y-4">
          <Card className="lg:sticky lg:top-6 shadow-sm">
            <CardHeader className="pb-2 sm:pb-4 p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs sm:text-sm">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Your phone"
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                    required
                  />
                </div>
                 <div>
                  <Label className="text-xs sm:text-sm">Location <span className="text-red-500">*</span></Label>
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600">Delivering to</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">
                        {selectedHostel === "Other" ? "Other" : `${selectedHostel}`}
                      </p>
                    </div>
                  </div>
                 </div>

                 {selectedHostel === "Other" ? (
                  <div>
                    <Label htmlFor="customAddress" className="text-xs sm:text-sm">Address <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="customAddress"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Complete address"
                      rows={2}
                      className="text-xs sm:text-sm"
                      required
                    />
                  </div>
                 ) : (
                  <div>
                    <Label htmlFor="room" className="text-xs sm:text-sm">Room No. <span className="text-red-500">*</span></Label>
                    <Input
                      id="room"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="Room number"
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                      disabled={!selectedHostel || selectedHostel === "Other"}
                      required={selectedHostel !== "Other"}
                    />
                  </div>
                 )}
                <div>
                  <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Special instructions..."
                    rows={2}
                    className="text-xs sm:text-sm"
                  />
                </div>

                {hasDhabaProducts() && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="text-[10px] sm:text-xs text-amber-800 font-medium">
                      🍽️ Select dhaba for items above
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="payment" className="text-xs sm:text-sm">Payment <span className="text-red-500">*</span></Label>
                  <Select onValueChange={setPaymentMethod} value={paymentMethod} required>
                    <SelectTrigger id="payment" className="h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash on Delivery</SelectItem>
                      <SelectItem value="online">Online (Razorpay)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "online" && (
                  <RazorpayPayment
                    amount={calculateTotal()}
                    orderNumber={`CC${Date.now()}`}
                    onSuccess={(paymentId) => {
                      setRazorpayPaymentId(paymentId);
                      placeOrder(paymentId);
                    }}
                    onError={async (error) => {
                      await Notification.create({
                        user_id: user.id,
                        title: "Payment Failed",
                        message: error || "Payment was unsuccessful. Please try again.",
                        type: "error"
                      });
                    }}
                  />
                )}

                {/* Discount Code */}
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <Label className="text-[10px] sm:text-xs font-semibold text-blue-900 mb-1.5 block">Discount Code</Label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Code"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setCodeError("");
                      }}
                      disabled={!!appliedCampaign}
                      className="border-blue-300 h-7 sm:h-8 text-xs"
                    />
                    <Button
                      type="button"
                      onClick={appliedCampaign ? () => { setAppliedCampaign(null); setDiscountCode(""); } : applyDiscountCode}
                      variant="outline"
                      size="sm"
                      className={`h-7 sm:h-8 text-[10px] sm:text-xs px-2 ${appliedCampaign ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
                    >
                      {appliedCampaign ? "Remove" : "Apply"}
                    </Button>
                  </div>
                  {codeError && <p className="text-[9px] sm:text-xs text-red-600 mt-0.5">{codeError}</p>}
                  {appliedCampaign && (
                    <p className="text-[9px] sm:text-xs text-green-600 mt-0.5 font-medium">
                      ✓ {appliedCampaign.name} applied!
                    </p>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                {loyaltyPoints >= 100 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600 font-bold text-xs">★</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-[10px] sm:text-xs font-semibold text-emerald-900 block">Loyalty Points</Label>
                        <p className="text-[9px] sm:text-[10px] text-emerald-700">{loyaltyPoints} pts (₹{(loyaltyPoints / 10).toFixed(2)})</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Input
                        type="number"
                        min="0"
                        max={Math.min(loyaltyPoints, calculateSubtotal() * 10)}
                        value={pointsToRedeem}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const maxPoints = Math.min(loyaltyPoints, Math.floor((calculateSubtotal() + calculateShippingCharge()) * 10));
                          setPointsToRedeem(Math.min(value, maxPoints));
                        }}
                        placeholder="Points"
                        className="border-emerald-300 h-7 text-xs"
                      />
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToRedeem(Math.min(100, loyaltyPoints))}
                          className="flex-1 text-[10px] h-6"
                        >
                          Use 100
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxPoints = Math.min(loyaltyPoints, Math.floor((calculateSubtotal() + calculateShippingCharge()) * 10));
                            setPointsToRedeem(maxPoints);
                          }}
                          className="flex-1 text-[10px] h-6"
                        >
                          Max
                        </Button>
                      </div>
                      {pointsToRedeem > 0 && (
                        <p className="text-[9px] sm:text-xs text-emerald-700 font-medium">
                          Save ₹{calculatePointsDiscount().toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                </div>

                <div className="border-t pt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{calculateSubtotal().toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-medium">
                    {calculateShippingCharge() === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${calculateShippingCharge().toFixed(0)}`
                    )}
                  </span>
                </div>
                {appliedCampaign && calculateCampaignDiscount() > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs text-blue-600">
                    <span>Discount ({appliedCampaign.code})</span>
                    <span className="font-medium">-₹{calculateCampaignDiscount().toFixed(0)}</span>
                  </div>
                )}
                {appliedCampaign?.discount_type === 'free_shipping' && calculateShippingCharge() > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs text-blue-600">
                    <span>Free Shipping</span>
                    <span className="font-medium">-₹{calculateShippingCharge().toFixed(0)}</span>
                  </div>
                )}
                {pointsToRedeem > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs text-emerald-600">
                    <span>Points</span>
                    <span className="font-medium">-₹{calculatePointsDiscount().toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm sm:text-base font-bold pt-1.5 border-t">
                  <span>Total</span>
                  <span className="text-emerald-600">₹{calculateTotal().toFixed(0)}</span>
                </div>
              </div>
              
              <Button
                onClick={() => placeOrder()}
                disabled={isPlacingOrder || cartItems.length === 0 || calculateSubtotal() === 0}
                className="w-full h-9 sm:h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-semibold"
              >
                {isPlacingOrder ? "Processing..." : paymentMethod === "online" ? "Continue to Pay" : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}