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

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);

  const checkAdminAccess = useCallback(async () => {
    try {
      const currentUser = await User.me();
      if (currentUser.role !== 'admin' && (!currentUser.assigned_role_ids || currentUser.assigned_role_ids.length === 0)) {
        navigate(createPageUrl('Shop'));
        return;
      }
      setUser(currentUser);
      
      // Load user permissions based on roles
      if (currentUser.role === 'admin') {
        // Super admin has all permissions
        setUserPermissions(['all']);
      } else if (currentUser.assigned_role_ids && currentUser.assigned_role_ids.length > 0) {
        // Load permissions from assigned roles
        const rolePromises = currentUser.assigned_role_ids.map(roleId => 
          base44.entities.Role.filter({ id: roleId })
        );
        const roleResults = await Promise.all(rolePromises);
        const allRoles = roleResults.flat();
        
        // Combine all permissions from all roles
        const combinedPermissions = new Set();
        allRoles.forEach(role => {
          if (role.permissions) {
            role.permissions.forEach(permission => combinedPermissions.add(permission));
          }
        });
        
        setUserPermissions(Array.from(combinedPermissions));
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
    if (userPermissions.includes('all')) return true;
    
    // Check if user has the exact permission
    if (userPermissions.includes(permission)) return true;
    
    // Map tab permissions to specific role permissions
    const permissionMaps = {
      'manage_products': ['view_products', 'edit_products', 'manage_inventory', 'manage_products'],
      'manage_delivery': ['view_delivery_portal', 'manage_delivery_persons', 'manage_delivery'],
      'manage_orders': ['view_orders', 'edit_orders', 'manage_orders'],
      'manage_categories': ['view_categories', 'edit_categories', 'manage_categories'],
      'manage_campaigns': ['view_campaigns', 'edit_campaigns', 'manage_campaigns'],
      'manage_reviews': ['view_reviews', 'edit_reviews', 'manage_reviews'],
      'manage_crm': ['view_crm', 'manage_crm'],
      'manage_settings': ['view_settings', 'edit_settings', 'manage_settings'],
      'manage_roles': ['view_roles', 'edit_roles', 'manage_roles'],
      'view_summary': ['view_dashboard', 'view_analytics', 'view_summary']
    };
    
    // Check if user has any related permission
    if (permissionMaps[permission]) {
      return permissionMaps[permission].some(p => userPermissions.includes(p));
    }
    
    return false;
  };

  // Define tabs with their required permissions - specific tabs for specific permissions
  const adminTabs = [
    // Product Manager specific tabs
    { value: "products", label: "Products", permission: "manage_products", component: <ProductManagement /> },
    { value: "bulk-update", label: "Bulk Update", permission: "manage_products", component: <BulkProductUpdate /> },
    { value: "categories", label: "Categories", permission: "manage_categories", component: <CategoryManagement /> },
    { value: "scheduler", label: "Product Scheduler", permission: "manage_products", component: <ProductScheduler /> },
    { value: "inventory-forecast", label: "Inventory Forecasting", permission: "manage_products", component: <AIInventoryForecasting /> },
    
    // Delivery Person specific tabs
    { value: "delivery", label: "Delivery Management", permission: "manage_delivery", component: <DeliveryPersonManagement /> },
    { value: "orders", label: "Orders", permission: "manage_orders", component: <OrderManagement /> },
    
    // Dashboard and analytics (available to most roles)
    { value: "dashboard", label: "Dashboard", permission: "view_summary", component: <EnhancedDashboard /> },
    { value: "summary", label: "Daily Summary", permission: "view_summary", component: <DailyOrderSummary /> },
    
    // Marketing and CRM
    { value: "crm", label: "CRM", permission: "manage_crm", component: <CRMModule /> },
    { value: "marketing", label: "Marketing Automation", permission: "manage_campaigns", component: <MarketingAutomation /> },
    { value: "campaigns", label: "Campaigns", permission: "manage_campaigns", component: <CampaignManagement /> },
    
    // AI Features
    { value: "ai-insights", label: "AI Intelligence", permission: "view_summary", component: <UnifiedAIDashboard /> },
    { value: "product-insights", label: "AI Product Insights", permission: "manage_products", component: <AIProductInsights /> },
    { value: "dynamic-pricing", label: "Dynamic Pricing", permission: "manage_products", component: <DynamicPricing /> },
    { value: "ai-orders", label: "AI Order Management", permission: "manage_orders", component: <AIOrderManagement /> },
    { value: "support-ai", label: "AI Support Assistant", permission: "manage_orders", component: <AISupportAssistant /> },
    
    // Reviews and Feedback
    { value: "reviews", label: "Reviews", permission: "manage_reviews", component: <ReviewModeration /> },
    { value: "feedback", label: "Feedback Analysis", permission: "manage_reviews", component: <FeedbackAnalysis /> },
    { value: "retention", label: "Customer Retention", permission: "manage_crm", component: <CustomerRetention /> },
    
    // Settings (admin only)
    { value: "recommendations", label: "AI Recommendations", permission: "manage_settings", component: <RecommendationConfig /> },
    { value: "notifications", label: "Notification Config", permission: "manage_settings", component: <NotificationConfigManager /> },
    { value: "gamification", label: "Gamification", permission: "manage_settings", component: <GamificationConfig /> },
    { value: "settings", label: "Settings", permission: "manage_settings", component: <SettingsManagement /> },
    { value: "roles", label: "Roles & Permissions", permission: "manage_roles", component: <RoleManagement /> }
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