import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Star, TrendingUp, Gift, History, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Load loyalty transactions
      const allTransactions = await base44.entities.LoyaltyTransaction.filter(
        { user_id: currentUser.id },
        '-created_date'
      );
      
      setTransactions(allTransactions);

      // Calculate balance
      const balance = allTransactions.reduce((sum, t) => sum + t.points, 0);
      setLoyaltyBalance(balance);

      // Calculate earned and redeemed
      const earned = allTransactions
        .filter(t => t.transaction_type === 'earned' || t.transaction_type === 'bonus')
        .reduce((sum, t) => sum + t.points, 0);
      const redeemed = Math.abs(allTransactions
        .filter(t => t.transaction_type === 'redeemed')
        .reduce((sum, t) => sum + t.points, 0));
      
      setTotalEarned(earned);
      setTotalRedeemed(redeemed);
    } catch (error) {
      console.error("Error loading user data:", error);
      navigate(createPageUrl('Shop'));
    }
    setIsLoading(false);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earned': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'redeemed': return <Gift className="w-4 h-4 text-blue-600" />;
      case 'bonus': return <Trophy className="w-4 h-4 text-yellow-600" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPointsValue = (points) => {
    return (points / 10).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user?.full_name || 'User'}</h1>
              <p className="text-emerald-100">{user?.email}</p>
              {user?.phone_number && (
                <p className="text-emerald-100 text-sm">{user.phone_number}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-6 h-6 text-emerald-600" />
              Loyalty Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Points Balance */}
            <div className="text-center py-6 bg-white rounded-xl shadow-sm border border-emerald-100">
              <p className="text-sm text-gray-600 mb-2">Your Points Balance</p>
              <div className="flex items-center justify-center gap-2">
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                <span className="text-5xl font-bold text-emerald-600">{loyaltyBalance}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Worth ₹{getPointsValue(loyaltyBalance)} in discounts
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-gray-600">Total Earned</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{totalEarned}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-gray-600">Total Redeemed</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{totalRedeemed}</p>
              </div>
            </div>

            {/* How it Works */}
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                How it Works
              </h4>
              <ul className="space-y-2 text-sm text-emerald-800">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Earn <strong>10 points</strong> for every ₹100 spent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Points are credited when order is delivered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Redeem points at checkout: <strong>10 points = ₹1 discount</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Minimum 100 points required for redemption</span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate(createPageUrl('Shop'))}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              Start Shopping & Earn Points
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No transactions yet</p>
              <p className="text-sm">Start shopping to earn loyalty points!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        transaction.points > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </Badge>
                    {transaction.balance_after !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Balance: {transaction.balance_after}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}