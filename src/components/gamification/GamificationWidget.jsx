import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap } from "lucide-react";

export default function GamificationWidget({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const records = await base44.entities.Gamification.filter({ user_id: user.id });
      if (records.length > 0) {
        setStats(records[0]);
      } else {
        // Create initial record
        const newRecord = await base44.entities.Gamification.create({
          user_id: user.id,
          total_points: 0,
          level: 1
        });
        setStats(newRecord);
      }
    } catch (error) {
      console.error("Error loading gamification stats:", error);
    }
  };

  if (!stats) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Level {stats.level}</p>
              <p className="text-2xl font-bold">{stats.total_points} pts</p>
            </div>
          </div>
          <div className="flex gap-2">
            {stats.badges?.slice(0, 3).map((badge, idx) => (
              <div key={idx} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center" title={badge.name}>
                <Star className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>
        {stats.activity_streak > 0 && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Zap className="w-4 h-4" />
            {stats.activity_streak} day streak!
          </div>
        )}
      </CardContent>
    </Card>
  );
}