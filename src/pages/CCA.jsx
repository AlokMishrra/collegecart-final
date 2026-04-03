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
  import ReviewModeration from "../components/admin/ReviewModeration";
  import CampaignManagement from "../components/admin/CampaignManagement";
  import CRMModule from "../components/admin/CRMModule";
  import EnhancedDashboard from "../components/admin/EnhancedDashboard";
  import RecommendationConfig from "../components/admin/RecommendationConfig";
  import MarketingAutomation from "../components/admin/MarketingAutomation";
  import FeedbackAnalysis from "../components/admin/FeedbackAnalysis";
  import CustomerRetention from "../components/admin/CustomerRetention";
  import AIOrderManagement from "../components/admin/AIOrderManagement";
  import UnifiedAIDashboard from "../components/admin/UnifiedAIDashboard";
  import AIProductInsights from "../components/admin/AIProductInsights";
  import AIInventoryForecasting from "../components/admin/AIInventoryForecasting";
  import DynamicPricing from "../components/admin/DynamicPricing";
  import AISupportAssistant from "../components/admin/AISupportAssistant";
  import GamificationConfig from "../components/admin/GamificationConfig";
  import Leaderboard from "../components/gamification/Leaderboard";
  import AIKnowledgeBase from "../components/knowledge/AIKnowledgeBase";
  import OnboardingTour from "../components/onboarding/OnboardingTour";
  import BulkProductUpdate from "../components/admin/BulkProductUpdate";
  import NotificationConfigManager from "../components/admin/NotificationConfigManager";
  import ProductScheduler from "../components/admin/ProductScheduler";
  import CustomQRGenerator from "../components/admin/CustomQRGenerator";
  import DeliveryPerformance from "../components/admin/DeliveryPerformance";
  import BannerManagement from "../components/admin/BannerManagement";
  import DhabaMenuManagement from "../components/admin/DhabaMenuManagement";
  import ActivityLog from "../components/admin/ActivityLog";
  import DailyProfitCalculator from "../components/admin/DailyProfitCalculator";
  import HostelManagement from "../components/admin/HostelManagement";
  import HostelPerformanceMetrics from "../components/admin/HostelPerformanceMetrics";
  import SubscriptionManagement from "../components/admin/SubscriptionManagement";
  import ComboManagement from "../components/admin/ComboManagement";
  import BatchDeliveryManager from "../components/admin/BatchDeliveryManager";

export default function CCA() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);

  const checkAdminAccess = useCallback(async () => {
    try {
      const currentUser = await User.me();
      
      // Check if user is a delivery person by checking localStorage
      const deliveryPerson = localStorage.getItem('deliveryPerson');
      if (deliveryPerson) {
        // Delivery persons cannot access admin panel
        navigate(createPageUrl('Delivery'));
        return;
      }
      
      // Only allow admin users or users with specific admin role assignments
      if (currentUser.role !== 'admin' && (!currentUser.assigned_role_ids || currentUser.assigned_role_ids.length === 0)) {
        navigate(createPageUrl('Shop')); // Silently redirect — don't reveal admin page name
        return;
      }
      
      // If user has assigned roles, verify they are NOT delivery-only roles
      if (currentUser.assigned_role_ids && currentUser.assigned_role_ids.length > 0) {
        const rolePromises = currentUser.assigned_role_ids.map(roleId => 
          base44.entities.Role.filter({ id: roleId })
        );
        const roleResults = await Promise.all(rolePromises);
        const roles = roleResults.flat();
        
        // Check if user only has delivery-related permissions
        const isDeliveryOnly = roles.every(role => 
          role.permissions && 
          role.permissions.length > 0 && 
          role.permissions.every(perm => perm.includes('delivery') || perm === 'view_delivery_portal')
        );
        
        if (isDeliveryOnly) {
          // User only has delivery permissions, redirect to delivery portal
          navigate(createPageUrl('Delivery'));
          return;
        }
      }
      
      setUser(currentUser);
      
      // Load user permissions
      if (currentUser.role === 'admin' || (currentUser.assigned_role_ids && currentUser.assigned_role_ids.length > 0)) {
        setUserPermissions(['all']);
      }
    } catch (error) {
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAdminAccess();
    }, 300);
    return () => clearTimeout(timer);
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
    { value: "dashboard", label: "Dashboard", permission: "view_summary", component: <EnhancedDashboard /> },
    { value: "ai-insights", label: "AI Intelligence", permission: "view_summary", component: <UnifiedAIDashboard /> },
    { value: "summary", label: "Daily Summary", permission: "view_summary", component: <DailyOrderSummary /> },
    { value: "profit", label: "Profit Analytics", permission: "view_summary", component: <DailyProfitCalculator /> },
    { value: "crm", label: "CRM", permission: "manage_crm", component: <CRMModule /> },
    { value: "retention", label: "Customer Retention", permission: "manage_crm", component: <CustomerRetention /> },
    { value: "marketing", label: "Marketing Automation", permission: "manage_campaigns", component: <MarketingAutomation /> },
    { value: "feedback", label: "Feedback Analysis", permission: "manage_reviews", component: <FeedbackAnalysis /> },
    { value: "ai-orders", label: "AI Order Management", permission: "manage_orders", component: <AIOrderManagement /> },
    { value: "support-ai", label: "AI Support Assistant", permission: "manage_orders", component: <AISupportAssistant /> },
    { value: "products", label: "Products", permission: "manage_products", component: <ProductManagement /> },
    { value: "combos", label: "Combos", permission: "manage_products", component: <ComboManagement /> },
    { value: "bulk-update", label: "Bulk Update", permission: "manage_products", component: <BulkProductUpdate /> },
    { value: "scheduler", label: "Product Scheduler", permission: "manage_products", component: <ProductScheduler /> },
    { value: "product-insights", label: "AI Product Insights", permission: "manage_products", component: <AIProductInsights /> },
    { value: "inventory-forecast", label: "Inventory Forecasting", permission: "manage_products", component: <AIInventoryForecasting /> },
    { value: "dynamic-pricing", label: "Dynamic Pricing", permission: "manage_products", component: <DynamicPricing /> },
    { value: "categories", label: "Categories", permission: "manage_categories", component: <CategoryManagement /> },
    { value: "banners", label: "Banners", permission: "manage_settings", component: <BannerManagement /> },
    { value: "dhaba-menu", label: "Dhaba Menu", permission: "manage_products", component: <DhabaMenuManagement /> },
    { value: "campaigns", label: "Campaigns", permission: "manage_campaigns", component: <CampaignManagement /> },
    { value: "recommendations", label: "AI Recommendations", permission: "manage_settings", component: <RecommendationConfig /> },
    { value: "reviews", label: "Reviews", permission: "manage_reviews", component: <ReviewModeration /> },
    { value: "hostels", label: "Hostels", permission: "manage_delivery", component: <HostelManagement /> },
    { value: "hostel-performance", label: "Hostel Performance", permission: "manage_delivery", component: <HostelPerformanceMetrics /> },
    { value: "delivery", label: "Delivery", permission: "manage_delivery", component: <DeliveryPersonManagement /> },
    { value: "batch-delivery", label: "Batch Dispatch", permission: "manage_delivery", component: <BatchDeliveryManager /> },
    { value: "delivery-performance", label: "Performance", permission: "manage_delivery", component: <DeliveryPerformance /> },
    { value: "orders", label: "Orders", permission: "manage_orders", component: <OrderManagement /> },
    { value: "notifications", label: "Notification Config", permission: "manage_settings", component: <NotificationConfigManager /> },
    { value: "gamification", label: "Gamification", permission: "manage_settings", component: <GamificationConfig /> },
    { value: "qr-generator", label: "QR Generator", permission: "manage_orders", component: <CustomQRGenerator /> },
    { value: "settings", label: "Settings", permission: "manage_settings", component: <SettingsManagement /> },
    { value: "roles", label: "Roles", permission: "manage_roles", component: <RoleManagement /> },
    { value: "activity-log", label: "Activity Log", permission: "manage_settings", component: <ActivityLog /> },
    { value: "subscriptions", label: "Subscriptions", permission: "manage_settings", component: <SubscriptionManagement /> }
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

      <AdminStats />

      {/* Onboarding Tour */}
      <OnboardingTour user={user} />

      {/* Leaderboard & Knowledge Base */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Leaderboard />
        <AIKnowledgeBase currentContext={allowedTabs[0]?.value} />
      </div>

      {allowedTabs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">You don't have permission to access any admin features.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <TabsList className="inline-flex h-auto bg-transparent border-0 p-0 gap-0">
              {allowedTabs.map(tab => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 bg-transparent px-6 py-3 text-gray-600 hover:text-gray-900"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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