import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  Settings, 
  Truck,
  Home,
  Bell,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "./components/shared/NotificationCenter";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isDeliveryPartner, setIsDeliveryPartner] = useState(false);
  const [userHasRole, setUserHasRole] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUser();
    checkDeliveryPartner();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Check if user has any assigned role
      if (currentUser.assigned_role_id) {
        setUserHasRole(true);
        // Load the role details to check permissions
        const roles = await base44.entities.Role.filter({ id: currentUser.assigned_role_id });
        if (roles.length > 0) {
          setUserRole(roles[0]);
        }
      }
    } catch (error) {
      // User not logged in
    }
  };

  const checkDeliveryPartner = () => {
    const savedDeliveryPerson = localStorage.getItem('deliveryPerson');
    setIsDeliveryPartner(!!savedDeliveryPerson);
  };

  const handleLogout = async () => {
    await User.logout();
    setUser(null);
  };

  const navigationItems = [
    {
      title: "Shop",
      url: createPageUrl("Shop"),
      icon: Home,
      showCondition: () => true
    },
    {
      title: "Cart",
      url: createPageUrl("Cart"),
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : null,
      showCondition: () => true
    },
    {
      title: "My Orders",
      url: createPageUrl("Orders"),
      icon: Package,
      showCondition: () => true
    },
    {
      title: "Admin Panel",
      url: createPageUrl("Admin"),
      icon: Settings,
      showCondition: () => user?.role === "admin" || userHasRole
    },
    {
      title: "Delivery Portal",
      url: createPageUrl("Delivery"),
      icon: Truck,
      showCondition: () => {
        const allowedEmails = [
          "tanmaygupta1285@gmail.com",
          "manangirigoswaim011@gmail.com", 
          "info@apnafreelancer.in"
        ];
        const isDeliveryRole = userRole && (
          userRole.name.toLowerCase().includes("delivery") ||
          userRole.permissions?.includes("view_delivery_portal")
        );
        return allowedEmails.includes(user?.email) || isDeliveryRole;
      }
    }
  ];

  const isActive = (url) => location.pathname === url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">CollegeCart</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            {user && (
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">CollegeCart</h2>
                  <p className="text-xs text-gray-500">Grocery Delivery</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden absolute top-4 right-4"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map((item) => {
                if (!user && !isDeliveryPartner) return null;
                if (!item.showCondition()) return null;

                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive(item.url)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                    {item.badge && (
                      <Badge className="ml-auto bg-emerald-500 text-white">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            {user && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.full_name || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="hidden lg:flex items-center justify-between p-6 bg-white border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentPageName || 'CollegeCart'}
            </h1>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              {!user && (
                <Button
                  onClick={() => User.login()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}