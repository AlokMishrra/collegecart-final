import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Clock, Loader2 } from "lucide-react";

const statusColor = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800"
};
const categoryLabel = { admin: "Admin Related", inventory: "Inventory Related", payment: "Payment", other: "Other" };

export default function RaiseQuery({ deliveryPerson }) {
  const [queries, setQueries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("admin");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadQueries(); }, []);

  const loadQueries = async () => {
    const data = await base44.entities.DeliveryQuery.filter(
      { delivery_person_id: deliveryPerson.id }, '-created_date', 30
    ).catch(() => []);
    setQueries(data);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    await base44.entities.DeliveryQuery.create({
      delivery_person_id: deliveryPerson.id,
      delivery_person_name: deliveryPerson.name,
      category,
      description: description.trim(),
      status: "open"
    });
    setDescription("");
    setCategory("admin");
    setShowForm(false);
    await loadQueries();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">Support Queries</h3>
          <p className="text-xs text-gray-500 mt-0.5">Usually resolved within a few hours</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" />Raise Query
        </Button>
      </div>

      {showForm && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Related</SelectItem>
                  <SelectItem value="inventory">Inventory Related</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Describe your issue</Label>
              <Textarea
                className="mt-1"
                placeholder="Describe your issue in detail..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />Usually resolved within a few hours
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Query"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {queries.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No queries raised yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map(q => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className="bg-purple-100 text-purple-700 text-xs">{categoryLabel[q.category] || q.category}</Badge>
                  <Badge className={`text-xs ${statusColor[q.status] || "bg-gray-100 text-gray-600"}`}>{q.status}</Badge>
                </div>
                <p className="text-sm text-gray-800">{q.description}</p>
                {q.admin_response && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-2.5 border-l-2 border-blue-400">
                    <p className="text-xs text-blue-700 font-semibold mb-0.5">Admin Response:</p>
                    <p className="text-xs text-blue-800">{q.admin_response}</p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-2">{new Date(q.created_date).toLocaleString('en-IN')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}