import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";

const ONBOARDING_STEPS = {
  admin: [
    { id: "dashboard", title: "Dashboard Overview", description: "Your central hub for all business metrics and AI insights. Monitor revenue, orders, and customer trends at a glance.", tab: "ai-insights" },
    { id: "crm", title: "Customer Relationship Management", description: "Manage customer data, segments, and send targeted communications. Build lasting relationships with your customers.", tab: "crm" },
    { id: "marketing", title: "Marketing Automation", description: "Create personalized campaigns with A/B testing. Let AI help you reach the right customers at the right time.", tab: "marketing" },
    { id: "products", title: "Product Management", description: "Add, edit, and manage your product catalog. AI can help generate descriptions and optimize pricing.", tab: "products" },
    { id: "ai-tools", title: "AI-Powered Tools", description: "Leverage AI for inventory forecasting, churn prediction, and business intelligence. Make data-driven decisions effortlessly.", tab: "ai-insights" }
  ],
  support: [
    { id: "orders", title: "Order Management", description: "View and manage customer orders. Update statuses and handle customer requests efficiently.", tab: "orders" },
    { id: "support", title: "AI Support Assistant", description: "Get AI-powered solutions for customer issues. Resolve problems faster with intelligent recommendations.", tab: "support-ai" },
    { id: "customers", title: "Customer Information", description: "Access customer details, order history, and preferences. Provide personalized support.", tab: "crm" }
  ],
  delivery: [
    { id: "deliveries", title: "Delivery Dashboard", description: "View assigned orders and available deliveries. Accept orders and manage your delivery queue.", tab: "delivery" },
    { id: "ai-routes", title: "AI Route Optimization", description: "Get optimal delivery routes and delay predictions. Work smarter, not harder.", tab: "delivery" },
    { id: "earnings", title: "Track Your Earnings", description: "Monitor your completed deliveries and earnings. See your commission on each order.", tab: "delivery" }
  ]
};

export default function OnboardingTour({ user, onComplete }) {
  const [progress, setProgress] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, [user]);

  const checkOnboarding = async () => {
    try {
      const records = await base44.entities.OnboardingProgress.filter({ user_id: user.id });
      
      if (records.length === 0) {
        // New user - start onboarding
        const role = user.role === 'admin' ? 'admin' : 'support';
        const newProgress = await base44.entities.OnboardingProgress.create({
          user_id: user.id,
          role,
          completed_steps: [],
          current_step: ONBOARDING_STEPS[role][0].id,
          is_completed: false
        });
        setProgress(newProgress);
        setIsOpen(true);
      } else if (!records[0].is_completed && !records[0].skip_onboarding) {
        setProgress(records[0]);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error checking onboarding:", error);
    }
  };

  const steps = progress ? ONBOARDING_STEPS[progress.role] || [] : [];
  const step = steps[currentStep];

  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      const newCompleted = [...progress.completed_steps, step.id];
      await base44.entities.OnboardingProgress.update(progress.id, {
        completed_steps: newCompleted,
        current_step: steps[currentStep + 1].id
      });
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const completeOnboarding = async () => {
    await base44.entities.OnboardingProgress.update(progress.id, {
      is_completed: true
    });
    
    // Award points for completing onboarding
    const gamification = await base44.entities.Gamification.filter({ user_id: user.id });
    if (gamification.length > 0) {
      await base44.entities.Gamification.update(gamification[0].id, {
        total_points: (gamification[0].total_points || 0) + 100
      });
    }
    
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const skipOnboarding = async () => {
    await base44.entities.OnboardingProgress.update(progress.id, {
      skip_onboarding: true
    });
    setIsOpen(false);
  };

  if (!progress || !step) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Welcome to CollegeCart Admin
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={skipOnboarding}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge>Step {currentStep + 1} of {steps.length}</Badge>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
            <p className="text-gray-700">{step.description}</p>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button onClick={nextStep} className="bg-purple-600 hover:bg-purple-700">
              {currentStep === steps.length - 1 ? (
                "Complete Tour"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            You can always revisit this tour from the help menu
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}