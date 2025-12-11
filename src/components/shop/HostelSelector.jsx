import React, { useState } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function HostelSelector({ onHostelSelected }) {
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const hostels = [
    { id: "Mithali", name: "Mithali Hostel", icon: "🏠" },
    { id: "Gavaskar", name: "Gavaskar Hostel", icon: "🏢" },
    { id: "Virat", name: "Virat Hostel", icon: "🏛️" },
    { id: "Tendulkar", name: "Tendulkar Hostel", icon: "🏘️" },
    { id: "Other", name: "Other Location", icon: "📍" }
  ];

  const handleSubmit = async () => {
    if (!selectedHostel) return;
    
    setIsLoading(true);
    try {
      await User.updateMyUserData({ selected_hostel: selectedHostel });
      onHostelSelected(selectedHostel);
    } catch (error) {
      console.error("Error updating hostel:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Select Your Hostel</CardTitle>
            <p className="text-gray-600 mt-2">Choose your hostel to see available products</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hostels.map((hostel) => (
                <button
                  key={hostel.id}
                  onClick={() => setSelectedHostel(hostel.id)}
                  className={`
                    p-6 rounded-xl border-2 transition-all text-left
                    ${selectedHostel === hostel.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{hostel.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{hostel.name}</h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!selectedHostel || isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
            >
              {isLoading ? "Saving..." : "Continue Shopping"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}