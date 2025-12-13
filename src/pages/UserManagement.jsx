import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Package, Award, Heart, MapPin, Shield, Building2, Phone, Mail, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [userWishlist, setUserWishlist] = useState([]);
  const [userLoyalty, setUserLoyalty] = useState({ balance: 0, transactions: [] });

  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);

  const checkAdmin = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser.role !== 'admin' && (!currentUser.assigned_role_ids || currentUser.assigned_role_ids.length === 0)) {
        navigate(createPageUrl('Shop'));
      }
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, allRoles] = await Promise.all([
        base44.entities.User.list('-created_date'),
        base44.entities.Role.list()
      ]);
      setUsers(allUsers);
      setRoles(allRoles);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const loadUserDetails = async (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);

    try {
      // Load user orders
      const orders = await base44.entities.Order.filter(
        { user_id: user.id },
        '-created_date'
      );
      setUserOrders(orders);

      // Load wishlist
      const wishlist = await base44.entities.Wishlist.filter({ user_id: user.id });
      setUserWishlist(wishlist);

      // Load loyalty data
      const transactions = await base44.entities.LoyaltyTransaction.filter(
        { user_id: user.id },
        '-created_date'
      );
      const balance = transactions.reduce((sum, t) => sum + t.points, 0);
      setUserLoyalty({ balance, transactions });
    } catch (error) {
      console.error("Error loading user details:", error);
    }
  };

  const toggleUserRole = async (userId, roleId) => {
    try {
      const user = users.find(u => u.id === userId);
      const currentRoles = user.assigned_role_ids || [];
      
      let newRoles;
      if (currentRoles.includes(roleId)) {
        newRoles = currentRoles.filter(id => id !== roleId);
      } else {
        newRoles = [...currentRoles, roleId];
      }

      await base44.entities.User.update(userId, { assigned_role_ids: newRoles });
      loadData();

      await base44.entities.Notification.create({
        user_id: userId,
        title: "Role Updated",
        message: "Your account roles have been updated by an administrator",
        type: "info"
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone_number?.includes(query)
    );
  });

  const getUserRoles = (user) => {
    if (!user.assigned_role_ids || user.assigned_role_ids.length === 0) {
      return user.role === 'admin' ? ['Admin'] : ['Customer'];
    }
    return user.assigned_role_ids.map(roleId => {
      const role = roles.find(r => r.id === roleId);
      return role ? role.name : 'Unknown';
    });
  };

  const calculateUserStats = (userId) => {
    const orders = userOrders.filter(o => o.user_id === userId);
    const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    return { totalOrders: orders.length, totalSpent, completedOrders };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-emerald-700">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.phone_number && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {user.phone_number}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.selected_hostel ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{user.selected_hostel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user).map((role, idx) => (
                        <Badge key={idx} variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.created_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUserDetails(user)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Info Card */}
              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">{selectedUser.full_name || 'Unnamed User'}</h2>
                      <p className="text-emerald-100">{selectedUser.email}</p>
                      {selectedUser.phone_number && (
                        <p className="text-emerald-100 text-sm">{selectedUser.phone_number}</p>
                      )}
                      {selectedUser.selected_hostel && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">{selectedUser.selected_hostel} Hostel</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600">Orders</p>
                        <p className="text-lg font-bold">{userOrders.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">Wishlist</p>
                        <p className="text-lg font-bold">{userWishlist.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-xs text-gray-600">Points</p>
                        <p className="text-lg font-bold">{userLoyalty.balance}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Addresses</p>
                        <p className="text-lg font-bold">{selectedUser.saved_addresses?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="orders">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                  <TabsTrigger value="addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="roles">Roles</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-3">
                  {userOrders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No orders yet</p>
                  ) : (
                    userOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">Order #{order.order_number}</p>
                              <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-600">₹{order.total_amount.toFixed(2)}</p>
                              <Badge className="mt-1">{order.status}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-3">
                  <Card className="bg-emerald-50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="text-3xl font-bold text-emerald-600">{userLoyalty.balance} Points</p>
                      </div>
                    </CardContent>
                  </Card>
                  {userLoyalty.transactions.slice(0, 5).map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={transaction.points > 0 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="addresses" className="space-y-3">
                  {!selectedUser.saved_addresses || selectedUser.saved_addresses.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No saved addresses</p>
                  ) : (
                    selectedUser.saved_addresses.map((address, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-emerald-600 mt-1" />
                            <div>
                              <p className="font-semibold">{address.label}</p>
                              <p className="text-sm text-gray-600">{address.hostel} Hostel</p>
                              <p className="text-sm text-gray-600">Room: {address.room_number}</p>
                              {address.landmark && (
                                <p className="text-sm text-gray-600">Landmark: {address.landmark}</p>
                              )}
                              <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">System Role</Label>
                          <Badge className="mt-2">{selectedUser.role === 'admin' ? 'Administrator' : 'Customer'}</Badge>
                        </div>

                        {roles.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-3 block">Additional Roles</Label>
                            <div className="space-y-2">
                              {roles.map((role) => {
                                const hasRole = selectedUser.assigned_role_ids?.includes(role.id);
                                return (
                                  <div key={role.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{role.name}</p>
                                      <p className="text-sm text-gray-600">{role.description}</p>
                                    </div>
                                    <Button
                                      variant={hasRole ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleUserRole(selectedUser.id, role.id)}
                                    >
                                      {hasRole ? 'Remove' : 'Assign'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}