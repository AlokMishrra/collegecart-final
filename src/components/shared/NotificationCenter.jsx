import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      // User not logged in
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIF2i78+idTgwOUKjk77RgGgU7k9n0y3gqBCF1yPLglEILElyz6+ukUxELSKDh8bllHAU2jdXzzn0vBSZ6zPLTjT0HGGu98+qbSw0PVKzl7bBcGAQ+ltv1y3YnAyJ4y/DajUIKElyx6uyrWBUIR6Dg8bdoHgU1i9Tv0IExByJ7z/LPiDkGGW3A8+mWRw0PV6/l665aFgNAm9z1yXElAyN6zvHYjz8JFWe48uugURENUarj7a1aFgU+k9bz0II2Bjl/0PLMfzAGI3vP8s+FOQYZccLy6JJFDQ5WruTsrFgUA0Cc3fXIcSQDJH7P8dqQPQkUZ7ry6p5RDw5MqOLurVoWBkCU1/PTgzMGOn7Q8sx9LwYkezDy0YU5BhlxwvLokkUNDlau5OysWBQDQJzd9chxJAMkfs/x2pA9CRRnuvLqnlEPDkyo4u6tWhYGQJTX89ODMwY6ftDyzH0vBiR7MPLRhTkGGXHC8uiSRQ0OVq7k7KxYFANAnN31yHEkAyR+z/HakD0JFGe68uqeUQ8OTKji7q1aFgZAlNfz04MzBjp+0PLMfS8GJHsw8tGFOQYZccLy6JJFDQxSrOPrr1kWBUSe3PTJcSYEI3vP8tyRPgsVaLny65pREQxQquPurVsYBkGV1/XTgjQGOX/P8sx+MAYjfM3yz4U5BRpyw/HnkUUMDVOt5OusWRYEQ57c9MlxJgQie8/z3JI9ChVnuPHqm1EQDFGq4+2sWxgGQpXX9dOCNAY5f8/yzH4wBiN8zfLPhTkFGnLD8eeRRQwNU63k66xZFgRDntz0yXEmBCJ7z/Pckj0KFWe48eqbURAMUarj7axbGAZCldf104I0Bjl/z/LMfjAGI3zN8s+FOQUacsLx55FFDA1TreTrrFkWBEOe3PTJcSYEInvP89ySPQoVZ7jx6ptREAxRquPtrFsYBkKV1/XTgjQGOX/P8sx+MAYjfM3yz4U5BRpyw/HnkUUMDVOt5OusWRYEQ57c9MlxJgQie8/z3JI9ChVnuPHqm1EQDFGq4+2sWxgGQpXX9dOCNAY5f8/yzH4wBiN8zfLPhTkFGnLD8eeRRQwNU63k66xZFgRDntz0yXEmBCJ7z/Pckj0KFWe48eqbURAMUarj7axbGAZCldf104I0Bjl/z/LMfjAGI3zN8s+FOQUacsPx55FFDA1TreTrrFkWBEOe3PTJcSYEInvP89ySPQoVZ7jx6ptREAxRquPtrFsYBkKV1/XTgjQGOX/P8sx+MAYjfM3yz4U5BRpyw/HnkUUMDVOt5OusWRYEQ57c9MlxJgQie8/z3JI9ChVnuPHqm1EQDFGq4+2sWxgGQpXX9dOCNAY5f8/yzH4wBiN8zfLPhTkFGnLD8eeRRQwNU63k66xZFgRDntz0yXEmBCJ7z/Pckj0KFWe48eqbURAMUarj7axbGAZCldf104I0Bjl/z/LMfjAGI3zN8s+FOQUacsPx55FFDA1TreTrrFkWBEOe3PTJcSYEInvP89ySPQoVZ7jx6ptREAxRquPtrFsYBkKV1/XTgjQGOX/P8sx+MAYjfM3yz4U5BRpyw/HnkUUMDVOt5OusWRYEQ57c9MlxJgQie8/z3JI9ChVnuPHqm1EQDFGq4+2sWxgGQpXX9dOCNAY5f8/yzH4wBiN8zfLPhTkFGnLD8eeRRQwNU63k66xZFgRDntz0yXEmBCJ7z/Pckj0KFWe48eqbURAMUarj7axbGAZCldf104I0Bjl/z/LMfjAGI3zN8s+FOQUacsPx55FFDA1TreTrrFkWBEOe3PTJcSYEInvP89ySPQoVZ7jx6ptREAxRquPtrFsYBkKV1/XTgjQGOX/P8sx+MAYjfM3yz4U5BRpyw/HnkUUMDVOt5OusWRYEQ57c9MlxJgQie8/z3JI9ChVnuPHqm1EQDFGq4+2sWxgGQpXX9dOCNAY5f8/yzH4wBiN8zfLPhTkFGnLD8eeRRQwNU63k66xZFgRDntz0yXEmBCJ7z/Pckj0KFWe48eqbURAMUarj7axbGAZCldf104I0Bjl/z/LMfjAGI3zN8s+FOQUacsPx55FFDA==');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const allNotifications = await Notification.filter(
        { user_id: user.id },
        '-created_date',
        20
      );
      const newUnreadCount = allNotifications.filter(n => !n.is_read).length;
      
      // Play sound if there are new unread notifications
      if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
        playNotificationSound();
      }
      
      setNotifications(allNotifications);
      setUnreadCount(newUnreadCount);
      setPreviousUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { is_read: true });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          Notification.update(n.id, { is_read: true })
        )
      );
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return iconMap[type] || 'ℹ️';
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            <AnimatePresence>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-2"
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        !notification.is_read ? 'bg-emerald-50 border-emerald-200' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.created_date).toLocaleString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}