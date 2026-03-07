import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";

// Legacy static config kept for reference in Delivery.jsx shift expiry checks
export const SHIFT_CONFIG = {};

export default function ShiftSelector({ open, onSelectShift, onCancel }) {
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      base44.entities.DeliveryShift.filter({ is_active: true }, 'created_date')
        .then(data => setShifts(data || []))
        .catch(() => setShifts([]))
        .finally(() => setIsLoading(false));
      setSelectedShift(null);
    }
  }, [open]);

  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const isCurrentShift = (shift) => {
    const now = new Date();
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    const current = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return current >= start && current < end;
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Your Shift</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">Choose a shift to start receiving orders</p>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No shifts available. Contact admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 my-2">
            {shifts.map(shift => {
              const isCurrent = isCurrentShift(shift);
              const isSelected = selectedShift === shift.id;
              return (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShift(shift.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="w-5 h-5 mb-2 text-emerald-500" />
                  <p className="font-semibold text-sm text-gray-900">{shift.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
                  {isCurrent && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium">
                      ✓ Active Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

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