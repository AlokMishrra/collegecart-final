import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Clock } from "lucide-react";

export const SHIFT_CONFIG = {
  morning:   { label: "Morning Shift",   time: "8 AM – 12 PM",  startHour: 8,  endHour: 12, icon: Sun,   color: "yellow" },
  afternoon: { label: "Afternoon Shift", time: "12 PM – 4 PM",  startHour: 12, endHour: 16, icon: Sun,   color: "orange" },
  evening:   { label: "Evening Shift",   time: "4 PM – 8 PM",   startHour: 16, endHour: 20, icon: Clock, color: "orange" },
  night:     { label: "Night Shift",     time: "8 PM – 12 AM",  startHour: 20, endHour: 24, icon: Moon,  color: "blue"   },
};

export default function ShiftSelector({ open, onSelectShift, onCancel }) {
  const [selectedShift, setSelectedShift] = useState(null);
  const currentHour = new Date().getHours();

  const iconColorMap = { yellow: "text-yellow-500", orange: "text-orange-500", blue: "text-blue-500" };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Your Shift</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">Choose a shift to start receiving orders</p>

        <div className="grid grid-cols-2 gap-3 my-2">
          {Object.entries(SHIFT_CONFIG).map(([id, shift]) => {
            const isCurrent = currentHour >= shift.startHour && currentHour < shift.endHour;
            const isSelected = selectedShift === id;
            const IconComp = shift.icon;
            return (
              <button
                key={id}
                onClick={() => setSelectedShift(id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                }`}
              >
                <IconComp className={`w-6 h-6 mb-2 ${iconColorMap[shift.color]}`} />
                <p className="font-semibold text-sm text-gray-900">{shift.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{shift.time}</p>
                {isCurrent && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium">
                    ✓ Active Now
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={() => selectedShift && onSelectShift(selectedShift)}
            disabled={!selectedShift}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            Start Shift
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}