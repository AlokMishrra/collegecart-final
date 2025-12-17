import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, History, Package, ShoppingCart, Users, Settings, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const logs = await base44.entities.AdminActivityLog.list('-created_date', 100);
      setActivities(logs);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      setActivities([]);
    }
    setIsLoading(false);
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "create":
        return <span className="text-green-600">➕</span>;
      case "update":
        return <span className="text-blue-600">✏️</span>;
      case "delete":
        return <span className="text-red-600">🗑️</span>;
      case "status_change":
        return <span className="text-orange-600">🔄</span>;
      default:
        return <span className="text-gray-600">📝</span>;
    }
  };

  const getActionBadge = (actionType) => {
    const styles = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      status_change: "bg-orange-100 text-orange-800"
    };
    return styles[actionType] || "bg-gray-100 text-gray-800";
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case "Product":
        return <Package className="w-4 h-4" />;
      case "Order":
        return <ShoppingCart className="w-4 h-4" />;
      case "User":
      case "DeliveryPerson":
        return <Users className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.entity_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = filterAction === "all" || activity.action_type === filterAction;
    const matchesEntity = filterEntity === "all" || activity.entity_type === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const entityTypes = [...new Set(activities.map(a => a.entity_type))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Activity Log</h2>
          <p className="text-gray-600">Track all changes made in the admin panel</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-800">
          {filteredActivities.length} activities
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by user, action, or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : (
            filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getEntityIcon(activity.entity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={getActionBadge(activity.action_type)}>
                            {getActionIcon(activity.action_type)} {activity.action_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{activity.entity_type}</Badge>
                          <span className="text-sm text-gray-500">
                            {moment(activity.created_date).fromNow()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <UserCircle className="w-4 h-4" />
                          <span className="font-medium">{activity.user_name}</span>
                          <span>({activity.user_email})</span>
                          {activity.ip_address && (
                            <>
                              <span>•</span>
                              <span>IP: {activity.ip_address}</span>
                            </>
                          )}
                        </div>
                        {(activity.old_value || activity.new_value) && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                              View details
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                              {activity.old_value && (
                                <div className="mb-2">
                                  <p className="font-semibold text-gray-700 mb-1">Previous Value:</p>
                                  <pre className="bg-white p-2 rounded border overflow-x-auto">
                                    {JSON.stringify(activity.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {activity.new_value && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">New Value:</p>
                                  <pre className="bg-white p-2 rounded border overflow-x-auto">
                                    {JSON.stringify(activity.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}