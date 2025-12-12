import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const [gamification, users] = await Promise.all([
        base44.entities.Gamification.list('-total_points', 10),
        base44.entities.User.list()
      ]);

      const enriched = gamification.map(g => {
        const user = users.find(u => u.id === g.user_id);
        return { ...g, userName: user?.full_name || 'Unknown' };
      });

      setLeaders(enriched);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-orange-600" />;
    return <span className="text-sm font-bold text-gray-500">#{rank + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaders.map((leader, idx) => (
            <div key={leader.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getRankIcon(idx)}
                <div>
                  <p className="font-medium">{leader.userName}</p>
                  <p className="text-sm text-gray-600">Level {leader.level}</p>
                </div>
              </div>
              <Badge className="bg-purple-600">{leader.total_points} pts</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}