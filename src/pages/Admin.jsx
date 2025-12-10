import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Package, Users, Truck, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ProductManagement from "../components/admin/ProductManagement";
  import CategoryManagement from "../components/admin/CategoryManagement";
  import DeliveryPersonManagement from "../components/admin/DeliveryPersonManagement";
  import OrderManagement from "../components/admin/OrderManagement";
  import AdminStats from "../components/admin/AdminStats";
  import DailyOrderSummary from "../components/admin/DailyOrderSummary";
  import SettingsManagement from "../components/admin/SettingsManagement";
  import RoleManagement from "../components/admin/RoleManagement";

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);

  const checkAdminAccess = useCallback(async () => {
    try {
      const currentUser = await User.me();
      if (currentUser.role !== 'admin' && !currentUser.assigned_role_id) {
        navigate(createPageUrl('Shop'));
        return;
      }
      setUser(currentUser);
      
      // Load user permissions
      if (currentUser.role === 'admin') {
        // Admin has all permissions
        setUserPermissions(['all']);
      } else if (currentUser.assigned_role_id) {
        const roles = await base44.entities.Role.filter({ id: currentUser.assigned_role_id });
        if (roles.length > 0) {
          setUserPermissions(roles[0].permissions || []);
        }
      }
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const hasPermission = (permission) => {
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  // Define tabs with their required permissions
  const adminTabs = [
    { value: "summary", label: "Summary", permission: "view_summary", component: <DailyOrderSummary />, showStats: true },
    { value: "products", label: "Products", permission: "manage_products", component: <ProductManagement />, showStats: false },
    { value: "categories", label: "Categories", permission: "manage_categories", component: <CategoryManagement />, showStats: false },
    { value: "delivery", label: "Delivery", permission: "manage_delivery", component: <DeliveryPersonManagement />, showStats: false },
    { value: "orders", label: "Orders", permission: "manage_orders", component: <OrderManagement />, showStats: false },
    { value: "settings", label: "Settings", permission: "manage_settings", component: <SettingsManagement />, showStats: false },
    { value: "roles", label: "Roles", permission: "manage_roles", component: <RoleManagement />, showStats: false }
  ];

  // Filter tabs based on permissions
  const allowedTabs = adminTabs.filter(tab => hasPermission(tab.permission));

  // Set default tab to first allowed tab
  const defaultTab = allowedTabs.length > 0 ? allowedTabs[0].value : "summary";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage your CollegeCart store</p>
        </div>
      </div>

      {allowedTabs.some(tab => tab.showStats) && <AdminStats />}

      {allowedTabs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">You don't have permission to access any admin features.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${allowedTabs.length} overflow-x-auto`}>
            {allowedTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {allowedTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.component}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}