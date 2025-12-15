import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Star, Package, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function DeliveryPerformance() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [personsData, performanceData] = await Promise.all([
        base44.entities.DeliveryPerson.list(),
        base44.entities.DeliveryPerformance.list()
      ]);
      
      setDeliveryPersons(personsData);
      setPerformances(performanceData);
      
      // Calculate leaderboard
      const leaderboardData = personsData.map(person => {
        const personPerformances = performanceData.filter(p => p.delivery_person_id === person.id);
        
        const avgDeliveryTime = personPerformances.length > 0
          ? personPerformances.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) / personPerformances.length
          : 0;
        
        const avgRating = personPerformances.filter(p => p.customer_rating).length > 0
          ? personPerformances
              .filter(p => p.customer_rating)
              .reduce((sum, p) => sum + p.customer_rating, 0) / 
            personPerformances.filter(p => p.customer_rating).length
          : 0;
        
        const totalRevenue = personPerformances.reduce((sum, p) => sum + (p.order_value || 0), 0);
        
        return {
          id: person.id,
          name: person.name,
          totalDeliveries: person.total_deliveries || 0,
          avgDeliveryTime: avgDeliveryTime.toFixed(1),
          avgRating: avgRating.toFixed(1),
          totalEarnings: person.total_earnings || 0,
          totalRevenue: totalRevenue,
          is_available: person.is_available
        };
      });
      
      // Sort by total deliveries descending
      leaderboardData.sort((a, b) => b.totalDeliveries - a.totalDeliveries);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
    setIsLoading(false);
  };

  const getRankBadge = (index) => {
    const colors = {
      0: "bg-yellow-100 text-yellow-800 border-yellow-300",
      1: "bg-gray-100 text-gray-800 border-gray-300",
      2: "bg-orange-100 text-orange-800 border-orange-300"
    };
    return colors[index] || "bg-blue-100 text-blue-800 border-blue-300";
  };

  const getRankIcon = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Delivery Performance</h2>
        <p className="text-gray-600">Track and analyze delivery partner performance</p>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Delivery Partner Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 ${
                  index < 3 ? getRankBadge(index) : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl font-bold w-12 text-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{person.name}</h3>
                        {person.is_available && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Deliveries</p>
                            <p className="text-sm font-semibold">{person.totalDeliveries}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Avg Time</p>
                            <p className="text-sm font-semibold">{person.avgDeliveryTime} min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <div>
                            <p className="text-xs text-gray-500">Rating</p>
                            <p className="text-sm font-semibold">{person.avgRating || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Earnings</p>
                            <p className="text-sm font-semibold">₹{person.totalEarnings.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No delivery performance data yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}