import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trophy, Award } from "lucide-react";

export default function GamificationConfig() {
  const [config, setConfig] = useState({
    supportTicketPoints: 10,
    campaignLaunchPoints: 25,
    deliveryPoints: 15,
    productAddPoints: 5,
    aiInsightPoints: 20
  });

  const badges = [
    { id: "first_delivery", name: "First Delivery", requirement: "Complete 1 delivery" },
    { id: "speed_demon", name: "Speed Demon", requirement: "Complete 50 deliveries" },
    { id: "support_hero", name: "Support Hero", requirement: "Resolve 100 tickets" },
    { id: "marketing_master", name: "Marketing Master", requirement: "Launch 20 campaigns" },
    { id: "product_pro", name: "Product Pro", requirement: "Add 50 products" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          Gamification Configuration
        </h2>
        <p className="text-gray-600">Configure points and badges for user engagement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Point Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Support Ticket Resolution</Label>
              <Input
                type="number"
                value={config.supportTicketPoints}
                onChange={(e) => setConfig({...config, supportTicketPoints: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label>Campaign Launch</Label>
              <Input
                type="number"
                value={config.campaignLaunchPoints}
                onChange={(e) => setConfig({...config, campaignLaunchPoints: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label>Delivery Completion</Label>
              <Input
                type="number"
                value={config.deliveryPoints}
                onChange={(e) => setConfig({...config, deliveryPoints: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label>Product Added</Label>
              <Input
                type="number"
                value={config.productAddPoints}
                onChange={(e) => setConfig({...config, productAddPoints: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">Save Configuration</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-600" />
            Available Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {badges.map(badge => (
              <div key={badge.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="font-semibold">{badge.name}</p>
                </div>
                <p className="text-sm text-gray-600">{badge.requirement}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}