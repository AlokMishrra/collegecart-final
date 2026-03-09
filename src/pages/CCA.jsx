import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
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

export default function CCA() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    try {
      const currentUser = await User.me();
      // Block delivery persons entirely
      if (localStorage.getItem('deliveryPerson')) {
        navigate(createPageUrl('Delivery'));
        return;
      }
      // Only full admins can access CCA
      if (currentUser.role !== 'admin') {
        // Non-admin users with roles go to StaffPortal
        if (currentUser.assigned_role_ids && currentUser.assigned_role_ids.length > 0) {
          navigate(createPageUrl('StaffPortal'));
        } else {
          navigate(createPageUrl('Shop'));
        }
        return;
      }
      setUser(currentUser);
    } catch {
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    const t = setTimeout(checkAccess, 300);
    return () => clearTimeout(t);
  }, [checkAccess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }
  if (!user) return null;

  const adminTabs = [
    { value: "dashboard", label: "Dashboard", component: <EnhancedDashboard /> },
    { value: "ai-insights", label: "AI Intelligence", component: <UnifiedAIDashboard /> },
    { value: "summary", label: "Daily Summary", component: <DailyOrderSummary /> },
    { value: "profit", label: "Profit Analytics", component: <DailyProfitCalculator /> },
    { value: "crm", label: "CRM", component: <CRMModule /> },
    { value: "retention", label: "Customer Retention", component: <CustomerRetention /> },
    { value: "marketing", label: "Marketing Automation", component: <MarketingAutomation /> },
    { value: "feedback", label: "Feedback Analysis", component: <FeedbackAnalysis /> },
    { value: "ai-orders", label: "AI Order Management", component: <AIOrderManagement /> },
    { value: "support-ai", label: "AI Support Assistant", component: <AISupportAssistant /> },
    { value: "products", label: "Products", component: <ProductManagement /> },
    { value: "bulk-update", label: "Bulk Update", component: <BulkProductUpdate /> },
    { value: "scheduler", label: "Product Scheduler", component: <ProductScheduler /> },
    { value: "product-insights", label: "AI Product Insights", component: <AIProductInsights /> },
    { value: "inventory-forecast", label: "Inventory Forecasting", component: <AIInventoryForecasting /> },
    { value: "dynamic-pricing", label: "Dynamic Pricing", component: <DynamicPricing /> },
    { value: "categories", label: "Categories", component: <CategoryManagement /> },
    { value: "banners", label: "Banners", component: <BannerManagement /> },
    { value: "dhaba-menu", label: "Dhaba Menu", component: <DhabaMenuManagement /> },
    { value: "campaigns", label: "Campaigns", component: <CampaignManagement /> },
    { value: "recommendations", label: "AI Recommendations", component: <RecommendationConfig /> },
    { value: "reviews", label: "Reviews", component: <ReviewModeration /> },
    { value: "hostels", label: "Hostels", component: <HostelManagement /> },
    { value: "hostel-performance", label: "Hostel Performance", component: <HostelPerformanceMetrics /> },
    { value: "delivery", label: "Delivery", component: <DeliveryPersonManagement /> },
    { value: "delivery-performance", label: "Performance", component: <DeliveryPerformance /> },
    { value: "orders", label: "Orders", component: <OrderManagement /> },
    { value: "notifications", label: "Notification Config", component: <NotificationConfigManager /> },
    { value: "gamification", label: "Gamification", component: <GamificationConfig /> },
    { value: "qr-generator", label: "QR Generator", component: <CustomQRGenerator /> },
    { value: "settings", label: "Settings", component: <SettingsManagement /> },
    { value: "roles", label: "Roles & Staff", component: <RoleManagement /> },
    { value: "activity-log", label: "Activity Log", component: <ActivityLog /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CCA Panel</h1>
          <p className="text-gray-600">CollegeCart Admin — Full Control</p>
        </div>
      </div>

      <AdminStats />
      <OnboardingTour user={user} />

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Leaderboard />
        <AIKnowledgeBase currentContext="dashboard" />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="border-b border-gray-200 overflow-x-auto">
          <TabsList className="inline-flex h-auto bg-transparent border-0 p-0 gap-0">
            {adminTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 bg-transparent px-6 py-3 text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {adminTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}