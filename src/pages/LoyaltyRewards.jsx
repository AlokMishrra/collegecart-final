import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Star, Gift, TrendingUp, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LOYALTY_TIERS = [
  { 
    name: "Bronze", 
    minSpending: 0, 
    color: "bg-amber-700", 
    icon: "🥉", 
    cashback: "1%",
    benefits: [
      "Earn 1% cashback on all orders",
      "Early access to sales and promotions",
      "Monthly exclusive coupons",
      "Special welcome bonus"
    ],
    description: "Start your journey with CollegeCart"
  },
  { 
    name: "Silver", 
    minSpending: 2000, 
    color: "bg-gray-400", 
    icon: "🥈", 
    cashback: "2%",
    benefits: [
      "Earn 2% cashback on all orders",
      "Free shipping on orders above ₹300",
      "Birthday month special discount",
      "Priority customer support",
      "Extended return window (14 days)"
    ],
    description: "Unlock more rewards and exclusive perks"
  },
  { 
    name: "Gold", 
    minSpending: 5000, 
    color: "bg-yellow-500", 
    icon: "🥇", 
    cashback: "3%",
    benefits: [
      "Earn 3% cashback on all orders",
      "Free shipping on all orders",
      "Exclusive VIP deals and discounts",
      "Priority support with dedicated line",
      "Early access to new products",
      "Quarterly bonus points"
    ],
    description: "Premium benefits for loyal customers"
  },
  { 
    name: "Platinum", 
    minSpending: 10000, 
    color: "bg-purple-600", 
    icon: "💎", 
    cashback: "5%",
    benefits: [
      "Earn 5% cashback on all orders",
      "Free express delivery (1-2 hours)",
      "Exclusive platinum-only products",
      "Dedicated account manager",
      "VIP events and tastings invitation",
      "Personal shopping assistance",
      "30-day return policy",
      "Double points on special occasions"
    ],
    description: "The ultimate CollegeCart experience"
  }
];

export default function LoyaltyRewards() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [currentTier, setCurrentTier] = useState(LOYALTY_TIERS[0]);
  const [nextTier, setNextTier] = useState(LOYALTY_TIERS[1]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load loyalty transactions
      const txns = await base44.entities.LoyaltyTransaction.filter({ user_id: currentUser.id }, '-created_date');
      setTransactions(txns);
      const balance = txns.reduce((sum, t) => sum + t.points, 0);
      setLoyaltyPoints(balance);

      // Calculate total spending
      const orders = await base44.entities.Order.filter({ user_id: currentUser.id, status: "delivered" });
      const spending = orders.reduce((sum, o) => sum + o.total_amount, 0);
      setTotalSpending(spending);

      // Determine tier
      const tier = [...LOYALTY_TIERS].reverse().find(t => spending >= t.minSpending) || LOYALTY_TIERS[0];
      setCurrentTier(tier);
      
      const tierIndex = LOYALTY_TIERS.indexOf(tier);
      setNextTier(tierIndex < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[tierIndex + 1] : null);
    } catch (error) {
      console.error("Error loading loyalty data:", error);
    }
    setIsLoading(false);
  };

  const progressToNextTier = () => {
    if (!nextTier) return 100;
    const progress = ((totalSpending - currentTier.minSpending) / (nextTier.minSpending - currentTier.minSpending)) * 100;
    return Math.min(progress, 100);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loyalty Rewards</h1>
          <p className="text-gray-600">Earn points and unlock exclusive benefits</p>
        </div>
        <Button onClick={() => navigate('/shop')} className="bg-emerald-600 hover:bg-emerald-700">
          Start Shopping
        </Button>
      </div>

      {/* Current Status */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{currentTier.icon}</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{currentTier.name} Member</h3>
                  <p className="text-gray-600">Total Spending: ₹{totalSpending.toFixed(2)}</p>
                </div>
              </div>
              {nextTier && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress to {nextTier.name}</span>
                    <span className="font-medium">₹{(nextTier.minSpending - totalSpending).toFixed(2)} to go</span>
                  </div>
                  <Progress value={progressToNextTier()} className="h-2" />
                </div>
              )}
            </div>
            <div className="text-center md:text-right">
              <div className="inline-block bg-white rounded-xl p-6 shadow-sm">
                <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Available Points</p>
                <p className="text-4xl font-bold text-purple-600">{loyaltyPoints}</p>
                <p className="text-sm text-gray-500">= ₹{(loyaltyPoints / 10).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Benefits */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LOYALTY_TIERS.map((tier, index) => (
          <Card key={tier.name} className={currentTier.name === tier.name ? "border-2 border-purple-600" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tier.icon}</span>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </div>
                {currentTier.name === tier.name && <Crown className="w-5 h-5 text-purple-600" />}
              </div>
              <p className="text-xs text-gray-500 mb-1">{tier.description}</p>
              <p className="text-sm font-semibold text-gray-900">₹{tier.minSpending}+ total spending</p>
              <Badge className={`mt-2 ${tier.color}`}>{tier.cashback} Cashback</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                    <Star className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Points History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.points > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Gift className={`w-5 h-5 ${txn.points > 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-500">{new Date(txn.created_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className={txn.points > 0 ? "bg-green-600" : "bg-red-600"}>
                    {txn.points > 0 ? '+' : ''}{txn.points}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}