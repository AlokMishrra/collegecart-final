import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Star, TrendingUp, Gift, History, Trophy, Package, MapPin, Heart, User as UserIcon, Edit2, Plus, Trash2, Building2, Camera } from "lucide-react";
import ImageUploader from "../components/shared/ImageUploader";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NotificationPreferences from "../components/shared/NotificationPreferences";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    hostel: "",
    room_number: "",
    landmark: "",
    phone: ""
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone_number: "",
    profile_photo: ""
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setProfileForm({
        full_name: currentUser.full_name || "",
        phone_number: currentUser.phone_number || "",
        profile_photo: currentUser.profile_photo || ""
      });

      // Load addresses
      if (currentUser.saved_addresses) {
        setAddresses(currentUser.saved_addresses);
      }

      // Load loyalty transactions
      const allTransactions = await base44.entities.LoyaltyTransaction.filter(
        { user_id: currentUser.id },
        '-created_date'
      );
      
      setTransactions(allTransactions);

      // Calculate balance
      const balance = allTransactions.reduce((sum, t) => sum + t.points, 0);
      setLoyaltyBalance(balance);

      // Calculate earned and redeemed
      const earned = allTransactions
        .filter(t => t.transaction_type === 'earned' || t.transaction_type === 'bonus')
        .reduce((sum, t) => sum + t.points, 0);
      const redeemed = Math.abs(allTransactions
        .filter(t => t.transaction_type === 'redeemed')
        .reduce((sum, t) => sum + t.points, 0));
      
      setTotalEarned(earned);
      setTotalRedeemed(redeemed);

      // Load recent orders
      const orders = await base44.entities.Order.filter(
        { user_id: currentUser.id },
        '-created_date',
        5
      );
      setRecentOrders(orders);

      // Load wishlist
      const wishlist = await base44.entities.Wishlist.filter(
        { user_id: currentUser.id }
      );
      setWishlistItems(wishlist);

      // Load wishlist products
      if (wishlist.length > 0) {
        const productIds = wishlist.map(w => w.product_id);
        const products = await base44.entities.Product.list();
        const filteredProducts = products.filter(p => productIds.includes(p.id));
        setWishlistProducts(filteredProducts);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.phone_number.trim()) {
      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Phone Number Required",
        message: "Please enter your phone number",
        type: "error"
      });
      return;
    }

    try {
      await base44.auth.updateMe(profileForm);
      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Profile Updated",
        message: "Your profile has been updated successfully",
        type: "success"
      });
      setShowEditProfile(false);
      loadUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      label: "",
      hostel: "",
      room_number: "",
      landmark: "",
      phone: user?.phone_number || ""
    });
    setShowAddressDialog(true);
  };

  const handleEditAddress = (index) => {
    setEditingAddress(index);
    setAddressForm(addresses[index]);
    setShowAddressDialog(true);
  };

  const handleSaveAddress = async () => {
    try {
      let newAddresses;
      if (editingAddress !== null) {
        newAddresses = [...addresses];
        newAddresses[editingAddress] = addressForm;
      } else {
        newAddresses = [...addresses, addressForm];
      }

      await base44.auth.updateMe({ saved_addresses: newAddresses });
      setAddresses(newAddresses);
      setShowAddressDialog(false);
      
      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Address Saved",
        message: editingAddress !== null ? "Address updated successfully" : "New address added successfully",
        type: "success"
      });
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  const handleDeleteAddress = async (index) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    
    try {
      const newAddresses = addresses.filter((_, i) => i !== index);
      await base44.auth.updateMe({ saved_addresses: newAddresses });
      setAddresses(newAddresses);
      
      await base44.entities.Notification.create({
        user_id: user.id,
        title: "Address Deleted",
        message: "Address deleted successfully",
        type: "info"
      });
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const item = wishlistItems.find(w => w.product_id === productId);
      if (item) {
        await base44.entities.Wishlist.delete(item.id);
        loadUserData();
        await base44.entities.Notification.create({
          user_id: user.id,
          title: "Removed from Wishlist",
          message: "Item removed from wishlist",
          type: "info"
        });
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earned': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'redeemed': return <Gift className="w-4 h-4 text-blue-600" />;
      case 'bonus': return <Trophy className="w-4 h-4 text-yellow-600" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPointsValue = (points) => {
    return (points / 10).toFixed(2);
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.full_name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
                />
              ) : (
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user?.full_name || 'User'}</h1>
                <p className="text-emerald-100">{user?.email}</p>
                {user?.phone_number && (
                  <p className="text-emerald-100 text-sm">{user.phone_number}</p>
                )}
                {user?.selected_hostel && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm text-emerald-100">{user.selected_hostel} Hostel</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditProfile(true)}
              className="text-white hover:bg-white/20"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Addresses</span>
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Wishlist</span>
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Loyalty</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{recentOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Wishlist Items</p>
                    <p className="text-2xl font-bold">{wishlistItems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saved Addresses</p>
                    <p className="text-2xl font-bold">{addresses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Loyalty Points</p>
                    <p className="text-2xl font-bold">{loyaltyBalance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <NotificationPreferences />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Orders</h3>
            <Link to={createPageUrl('Orders')}>
              <Button variant="outline" size="sm">View All Orders</Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-4">Start shopping to see your orders here</p>
                <Button onClick={() => navigate(createPageUrl('Shop'))} className="bg-emerald-600 hover:bg-emerald-700">
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-lg">Order #{order.order_number}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                        <p className="font-semibold text-lg text-emerald-600">₹{order.total_amount.toFixed(2)}</p>
                      </div>
                      <Link to={createPageUrl('Orders')}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Saved Addresses</h3>
            <Button onClick={handleAddAddress} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </div>

          {addresses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No saved addresses</h3>
                <p className="text-gray-600 mb-4">Add your delivery addresses for quick checkout</p>
                <Button onClick={handleAddAddress} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Address
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {addresses.map((address, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold">{address.label}</h4>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAddress(index)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAddress(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{address.hostel} Hostel</p>
                      <p>Room: {address.room_number}</p>
                      {address.landmark && <p>Landmark: {address.landmark}</p>}
                      <p>Phone: {address.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Wishlist Tab */}
        <TabsContent value="wishlist" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">My Wishlist</h3>
            <Link to={createPageUrl('Wishlist')}>
              <Button variant="outline" size="sm">View Full Wishlist</Button>
            </Link>
          </div>

          {wishlistProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
                <p className="text-gray-600 mb-4">Save your favorite products to buy them later</p>
                <Button onClick={() => navigate(createPageUrl('Shop'))} className="bg-emerald-600 hover:bg-emerald-700">
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistProducts.slice(0, 6).map((product) => (
                <Card key={product.id} className="group">
                  <CardContent className="p-4">
                    <div className="relative mb-3">
                      <img
                        src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromWishlist(product.id)}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <h4 className="font-semibold mb-1 line-clamp-2">{product.name}</h4>
                    <p className="text-lg font-bold text-emerald-600">₹{product.price}</p>
                    <Link to={createPageUrl(`ProductDetails?id=${product.id}`)}>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        View Product
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-600" />
                  Loyalty Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Points Balance */}
                <div className="text-center py-6 bg-white rounded-xl shadow-sm border border-emerald-100">
                  <p className="text-sm text-gray-600 mb-2">Your Points Balance</p>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                    <span className="text-5xl font-bold text-emerald-600">{loyaltyBalance}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Worth ₹{getPointsValue(loyaltyBalance)} in discounts
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-gray-600">Total Earned</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{totalEarned}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-gray-600">Total Redeemed</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{totalRedeemed}</p>
                  </div>
                </div>

                {/* How it Works */}
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    How it Works
                  </h4>
                  <ul className="space-y-2 text-sm text-emerald-800">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Earn <strong>10 points</strong> for every ₹100 spent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Points are credited when order is delivered</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Redeem points at checkout: <strong>10 points = ₹1 discount</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Minimum 100 points required for redemption</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => navigate(createPageUrl('Shop'))}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  Start Shopping & Earn Points
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Start shopping to earn loyalty points!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            transaction.points > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </Badge>
                        {transaction.balance_after !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: {transaction.balance_after}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Profile Photo</Label>
              <ImageUploader
                currentImage={profileForm.profile_photo}
                onImageSelect={(url) => setProfileForm({ ...profileForm, profile_photo: url })}
                placeholder="https://via.placeholder.com/300x300?text=Profile+Photo"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input
                id="phone_number"
                type="tel"
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                required
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress !== null ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Address Label</Label>
              <Input
                id="label"
                placeholder="Home, Work, etc."
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="hostel">Hostel</Label>
              <Input
                id="hostel"
                placeholder="Hostel name"
                value={addressForm.hostel}
                onChange={(e) => setAddressForm({ ...addressForm, hostel: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                placeholder="Room number"
                value={addressForm.room_number}
                onChange={(e) => setAddressForm({ ...addressForm, room_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="landmark">Landmark (Optional)</Label>
              <Textarea
                id="landmark"
                placeholder="Any nearby landmark"
                value={addressForm.landmark}
                onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Contact number"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAddress} className="bg-emerald-600 hover:bg-emerald-700">
              {editingAddress !== null ? 'Update' : 'Add'} Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}