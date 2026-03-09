import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Loader2 } from "lucide-react";

const statusColor = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800"
};
const categoryLabel = { admin: "Admin", inventory: "Inventory", payment: "Payment", other: "Other" };

export default function DeliveryQueryManagement() {
  const [queries, setQueries] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [respondDialog, setRespondDialog] = useState({ open: false, query: null });
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("in_progress");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadQueries(); }, []);

  const loadQueries = async () => {
    const data = await base44.entities.DeliveryQuery.list('-created_date', 100).catch(() => []);
    setQueries(data);
  };

  const openRespond = (q) => {
    setRespondDialog({ open: true, query: q });
    setResponseText(q.admin_response || "");
    setNewStatus(q.status === "open" ? "in_progress" : q.status);
  };

  const handleSaveResponse = async () => {
    const q = respondDialog.query;
    if (!q) return;
    setIsSaving(true);
    await base44.entities.DeliveryQuery.update(q.id, {
      admin_response: responseText,
      status: newStatus
    });
    setRespondDialog({ open: false, query: null });
    await loadQueries();
    setIsSaving(false);
  };

  const filtered = filterStatus === "all" ? queries : queries.filter(q => q.status === filterStatus);
  const openCount = queries.filter(q => q.status === "open").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
              {s === "open" && openCount > 0 && (
                <Badge className="ml-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0">{openCount}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No queries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <Card key={q.id} className={q.status === "open" ? "border-yellow-200" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-700 text-xs">{categoryLabel[q.category] || q.category}</Badge>
                      <Badge className={`text-xs ${statusColor[q.status]}`}>{q.status}</Badge>
                      <span className="text-xs text-gray-500 font-medium">{q.delivery_person_name}</span>
                    </div>
                    <p className="text-sm text-gray-800">{q.description}</p>
                    {q.admin_response && (
                      <div className="mt-2 bg-blue-50 rounded-lg p-2 border-l-2 border-blue-400">
                        <p className="text-xs text-blue-700 font-semibold">Your response:</p>
                        <p className="text-xs text-blue-800 mt-0.5">{q.admin_response}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">{new Date(q.created_date).toLocaleString('en-IN')}</p>
                  </div>
                  <Button size="sm" onClick={() => openRespond(q)} variant={q.status === "open" ? "default" : "outline"} className={q.status === "open" ? "bg-emerald-600 hover:bg-emerald-700 flex-shrink-0" : "flex-shrink-0"}>
                    {q.status === "open" ? "Respond" : "Update"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={respondDialog.open} onOpenChange={o => setRespondDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Query</DialogTitle>
          </DialogHeader>
          {respondDialog.query && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex gap-2 mb-1">
                  <Badge className="bg-purple-100 text-purple-700 text-xs">{categoryLabel[respondDialog.query.category]}</Badge>
                  <span className="text-xs text-gray-500">{respondDialog.query.delivery_person_name}</span>
                </div>
                <p className="text-gray-800">{respondDialog.query.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Your Response</label>
                <Textarea
                  placeholder="Type your response..."
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRespondDialog({ open: false, query: null })} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveResponse} disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Response"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}