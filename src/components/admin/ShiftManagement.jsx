import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock } from "lucide-react";

export default function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState({ name: "", start_time: "", end_time: "", description: "", is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    const data = await base44.entities.DeliveryShift.list('-created_date').catch(() => []);
    setShifts(data);
  };

  const openAdd = () => {
    setEditingShift(null);
    setForm({ name: "", start_time: "", end_time: "", description: "", is_active: true });
    setIsFormOpen(true);
  };

  const openEdit = (shift) => {
    setEditingShift(shift);
    setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, description: shift.description || "", is_active: shift.is_active ?? true });
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    if (editingShift) {
      await base44.entities.DeliveryShift.update(editingShift.id, form);
    } else {
      await base44.entities.DeliveryShift.create(form);
    }
    setIsFormOpen(false);
    loadShifts();
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.DeliveryShift.delete(id);
    loadShifts();
  };

  const toggleActive = async (shift) => {
    await base44.entities.DeliveryShift.update(shift.id, { is_active: !shift.is_active });
    loadShifts();
  };

  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-500 text-sm">Create and manage delivery shifts visible to partners</p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />Add Shift
        </Button>
      </div>

      {shifts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">No shifts created yet. Add a shift for delivery partners to select.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shifts.map(shift => (
            <Card key={shift.id} className={`border-2 ${shift.is_active ? "border-emerald-200" : "border-gray-200 opacity-60"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${shift.is_active ? "text-emerald-600" : "text-gray-400"}`} />
                    <div>
                      <p className="font-semibold text-gray-900">{shift.name}</p>
                      <p className="text-sm text-gray-500">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
                      {shift.description && <p className="text-xs text-gray-400 mt-0.5">{shift.description}</p>}
                    </div>
                  </div>
                  <Badge className={shift.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {shift.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Switch checked={shift.is_active} onCheckedChange={() => toggleActive(shift)} />
                    <span>{shift.is_active ? "Visible to partners" : "Hidden"}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="icon" onClick={() => openEdit(shift)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" className="text-red-600" onClick={() => handleDelete(shift.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Add New Shift"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Shift Name</Label>
              <Input placeholder="e.g. Morning Shift" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} required />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="Optional note" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active (visible to delivery partners)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? "Saving..." : editingShift ? "Update Shift" : "Add Shift"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}