import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Package, ShoppingCart, Truck, Tag, Star,
  Users2, BarChart2, Megaphone, Shield
} from "lucide-react";

import AdminStats from "../components/admin/AdminStats";
import DailyOrderSummary from "../components/admin/DailyOrderSummary";
import OrderManagement from "../components/admin/OrderManagement";
import ProductManagement from "../components/admin/ProductManagement";
import CategoryManagement from "../components/admin/CategoryManagement";
import DeliveryPersonManagement from "../components/admin/DeliveryPersonManagement";
import CampaignManagement from "../components/admin/CampaignManagement";
import ReviewModeration from "../components/admin/ReviewModeration";
import CRMModule from "../components/admin/CRMModule";
import DailyProfitCalculator from "../components/admin/DailyProfitCalculator";
import BannerManagement from "../components/admin/BannerManagement";

const ROLE_TABS = [
  {
    value: "dashboard",
    label: "Dashboard",
    icon: BarChart2,
    permissions: ["view_summary"],
    component: () => <><AdminStats /><div className="mt-4"><DailyOrderSummary /></div></>,
  },
  {
    value: "orders",
    label: "Orders",
    icon: ShoppingCart,
    permissions: ["manage_orders", "orders_manage", "view_orders", "orders_view"],
    component: () => <OrderManagement />,
  },
  {
    value: "profit",
    label: "Profit",
    icon: BarChart2,
    permissions: ["manage_orders", "orders_manage", "view_orders"],
    component: () => <DailyProfitCalculator />,
  },
  {
    value: "products",
    label: "Products",
    icon: Package,
    permissions: ["manage_products", "products_manage", "products_view"],
    component: () => <ProductManagement />,
  },
  {
    value: "categories",
    label: "Categories",
    icon: Tag,
    permissions: ["manage_categories", "categories_manage", "categories_view"],
    component: () => <CategoryManagement />,
  },
  {
    value: "banners",
    label: "Banners",
    icon: Megaphone,
    permissions: ["manage_settings"],
    component: () => <BannerManagement />,
  },
  {
    value: "delivery",
    label: "Delivery",
    icon: Truck,
    permissions: ["manage_delivery", "delivery_view", "view_delivery_portal"],
    component: () => <DeliveryPersonManagement />,
  },
  {
    value: "campaigns",
    label: "Campaigns",
    icon: Megaphone,
    permissions: ["manage_campaigns"],
    component: () => <CampaignManagement />,
  },
  {
    value: "reviews",
    label: "Reviews",
    icon: Star,
    permissions: ["manage_reviews"],
    component: () => <ReviewModeration />,
  },
  {
    value: "crm",
    label: "CRM",
    icon: Users2,
    permissions: ["manage_crm"],
    component: () => <CRMModule />,
  },
];

export default function StaffPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const currentUser = await User.me();

      // Block delivery persons
      if (localStorage.getItem('deliveryPerson')) {
        navigate(createPageUrl('Delivery'));
        return;
      }

      // Full admins go to CCA
      if (currentUser.role === 'admin') {
        navigate(createPageUrl('CCA'));
        return;
      }

      // Must have assigned roles
      if (!currentUser.assigned_role_ids || currentUser.assigned_role_ids.length === 0) {
        navigate(createPageUrl('Shop'));
        return;
      }

      // Load all roles and filter by assigned IDs client-side
      const allRoles = await base44.entities.Role.list();
      const roles = allRoles.filter(r => currentUser.assigned_role_ids.includes(r.id));
      const allPerms = roles.flatMap(r => r.permissions || []);

      // Delivery-only users (no other permissions) go to Delivery portal
      const nonDeliveryPerms = allPerms.filter(p => !p.includes('delivery') && p !== 'view_delivery_portal' && p !== 'view_orders' && p !== 'update_order_status');
      if (allPerms.length > 0 && nonDeliveryPerms.length === 0) {
        navigate(createPageUrl('Delivery'));
        return;
      }

      setUser(currentUser);
      setUserRoles(roles);
      setPermissions(allPerms);
    } catch {
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user) return null;

  const has = (perms) => permissions.includes('all') || perms.some(p => permissions.includes(p));

  const visibleTabs = ROLE_TABS.filter(tab => has(tab.permissions));

  if (visibleTabs.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center">
        <Shield className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Features Assigned</h2>
        <p className="text-gray-500 mt-2">Your role doesn't have any management permissions yet. Contact an admin.</p>
      </div>
    );
  }

  const defaultTab = visibleTabs[0].value;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
          <p className="text-gray-500 text-sm">Welcome, {user.full_name} — manage your assigned area</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userRoles.map(r => (
            <Badge key={r.id} className="bg-emerald-100 text-emerald-800 border border-emerald-200">
              {r.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Role Permissions Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleTabs.map(tab => (
          <Card key={tab.value} className="bg-emerald-50 border-emerald-100">
            <CardContent className="p-3 flex items-center gap-2">
              <tab.icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{tab.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <div className="border-b border-gray-200 overflow-x-auto">
          <TabsList className="inline-flex h-auto bg-transparent border-0 p-0 gap-0">
            {visibleTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 bg-transparent px-5 py-3 text-gray-600 hover:text-gray-900 flex items-center gap-1.5 whitespace-nowrap"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {visibleTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}