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

  const loadCart = useCallback(async (userId) => {
    setIsLoading(true);
    try {
      const items = await CartItem.filter({ user_id: userId });
      setCartItems(items);

      // Load product details
      const productIds = [...new Set(items.map(item => item.product_id))];
      const productPromises = productIds.map(id => 
        Product.filter({ id }).then(results => results[0])
      );
      const productsData = await Promise.all(productPromises);
      
      const productsMap = {};
      productsData.forEach(product => {
        if (product) productsMap[product.id] = product;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading cart:", error);
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

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = products[item.product_id];
      return total + (product ? product.price * item.quantity : 0);
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

  const placeOrder = async () => {
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

    setIsPlacingOrder(true);
    try {
      const orderNumber = `CC${Date.now()}`;
      const orderItems = cartItems.map(item => ({
        product_id: item.product_id,
        product_name: products[item.product_id]?.name || "",
        price: products[item.product_id]?.price || 0,
        quantity: item.quantity
      }));
      
      const fullAddress = selectedHostel === "Other" 
        ? customAddress 
        : `${selectedHostel} Hostel, Room No: ${roomNumber}`;

      const finalAmount = calculateTotal();
      
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
        payment_method: paymentMethod
      });

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

      // Clear cart
      await Promise.all(cartItems.map(item => CartItem.delete(item.id)));

      // Update user info
      await User.updateMyUserData({
        full_name: customerName,
        phone_number: phoneNumber
      });

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar at Top */}
      <DeliveryProgressBar 
        subtotal={calculateSubtotal()} 
        settings={settings} 
        isFirstOrder={isFirstOrder}
      />

      <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
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
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150"}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150";
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-emerald-600 font-medium">₹{product.price}/{product.unit}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-semibold px-3">{item.quantity}</span>
                          <Button
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{(product.price * item.quantity).toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

          {/* Personalized Recommendations at Checkout */}
          {user && (
            <RecommendationEngine
              user={user}
              onAddToCart={addToCart}
              getCartQuantity={getCartQuantity}
              context="checkout"
            />
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                 <div>
                  <Label htmlFor="hostel">Delivery Location <span className="text-red-500">*</span></Label>
                   <Select onValueChange={(value) => {
                     setSelectedHostel(value);
                     if (value !== "Other") setCustomAddress("");
                   }} value={selectedHostel} required>
                    <SelectTrigger id="hostel">
                      <SelectValue placeholder="Select your location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mithali">Mithali Hostel</SelectItem>
                      <SelectItem value="Gavaskar">Gavaskar Hostel</SelectItem>
                      <SelectItem value="Virat">Virat Hostel</SelectItem>
                      <SelectItem value="Tendulkar">Tendulkar Hostel</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>

                 {selectedHostel === "Other" ? (
                  <div>
                    <Label htmlFor="customAddress">Delivery Address <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="customAddress"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      required
                    />
                  </div>
                 ) : (
                  <div>
                    <Label htmlFor="room">Room Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="room"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="Enter room number"
                      disabled={!selectedHostel || selectedHostel === "Other"}
                      required={selectedHostel !== "Other"}
                    />
                  </div>
                 )}
                <div>
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="payment">Payment Method <span className="text-red-500">*</span></Label>
                  <Select onValueChange={setPaymentMethod} value={paymentMethod} required>
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash on Delivery</SelectItem>
                      <SelectItem value="online">Online Payment (UPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "online" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <Label className="text-sm font-medium text-emerald-900">Pay ₹{calculateTotal().toFixed(2)} via UPI</Label>
                    <div className="mt-3 flex flex-col items-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=7248316506@okbizaxis%26pn=CollegeCart%26am=${calculateTotal().toFixed(2)}%26cu=INR`}
                        alt="UPI QR Code"
                        className="w-40 h-40 border-4 border-white rounded-lg shadow-md"
                      />
                      <p className="text-xs text-emerald-700 mt-2">Scan QR with any UPI app</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => {
                          const upiUrl = `upi://pay?pa=7248316506@okbizaxis&pn=CollegeCart&am=${calculateTotal().toFixed(2)}&cu=INR`;
                          window.location.href = upiUrl;
                        }}
                      >
                        Open UPI App
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">UPI ID: 7248316506@okbizaxis</p>
                    </div>
                  </div>
                )}

                {/* Discount Code */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-blue-900 mb-2 block">Discount Code</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setCodeError("");
                      }}
                      disabled={!!appliedCampaign}
                      className="border-blue-300"
                    />
                    <Button
                      type="button"
                      onClick={appliedCampaign ? () => { setAppliedCampaign(null); setDiscountCode(""); } : applyDiscountCode}
                      variant="outline"
                      className={appliedCampaign ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}
                    >
                      {appliedCampaign ? "Remove" : "Apply"}
                    </Button>
                  </div>
                  {codeError && <p className="text-xs text-red-600 mt-1">{codeError}</p>}
                  {appliedCampaign && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✓ {appliedCampaign.name} applied!
                    </p>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                {loyaltyPoints >= 100 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-600 font-bold text-sm">★</span>
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-semibold text-emerald-900">Use Loyalty Points</Label>
                        <p className="text-xs text-emerald-700">Available: {loyaltyPoints} points (₹{(loyaltyPoints / 10).toFixed(2)})</p>
                      </div>
                    </div>
                    <div className="space-y-2">
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
                        placeholder="Enter points to redeem"
                        className="border-emerald-300"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToRedeem(Math.min(100, loyaltyPoints))}
                          className="flex-1 text-xs"
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
                          className="flex-1 text-xs"
                        >
                          Use Max
                        </Button>
                      </div>
                      {pointsToRedeem > 0 && (
                        <p className="text-xs text-emerald-700 font-medium">
                          You'll save ₹{calculatePointsDiscount().toFixed(2)} on this order
                        </p>
                      )}
                    </div>
                  </div>
                )}
                </div>

                <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Charge:</span>
                  <span className="font-medium">
                    {calculateShippingCharge() === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${calculateShippingCharge().toFixed(2)}`
                    )}
                  </span>
                </div>
                {settings && settings.free_delivery_above && calculateShippingCharge() > 0 && (
                  <p className="text-xs text-gray-500">
                    Add ₹{(settings.free_delivery_above - calculateSubtotal()).toFixed(2)} more for free delivery
                  </p>
                )}
                {appliedCampaign && calculateCampaignDiscount() > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Campaign Discount ({appliedCampaign.code}):</span>
                    <span className="font-medium">-₹{calculateCampaignDiscount().toFixed(2)}</span>
                  </div>
                )}
                {appliedCampaign?.discount_type === 'free_shipping' && calculateShippingCharge() > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Free Shipping ({appliedCampaign.code}):</span>
                    <span className="font-medium">-₹{calculateShippingCharge().toFixed(2)}</span>
                  </div>
                )}
                {pointsToRedeem > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Points Discount:</span>
                    <span className="font-medium">-₹{calculatePointsDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-emerald-600">₹{calculateTotal().toFixed(2)}</span>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    🎉 Saved ₹{calculatePointsDiscount().toFixed(2)} with loyalty points!
                  </p>
                )}
              </div>
              
              <Button
                onClick={placeOrder}
                disabled={isPlacingOrder}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isPlacingOrder ? "Placing Order..." : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}