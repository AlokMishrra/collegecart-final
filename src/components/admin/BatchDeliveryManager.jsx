import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, RefreshCw, CheckCircle, AlertTriangle, Users } from "lucide-react";

const MAX_BATCH_SIZE = 3;
const BATCH_WAIT_MINUTES = 3;

function groupOrdersByHostel(orders) {
  const groups = {};
  orders.forEach(order => {
    const addr = (order.delivery_address || "").toLowerCase();
    let hostel = "Other";
    ["mithali", "gavaskar", "virat", "tendulkar"].forEach(h => {
      if (addr.includes(h)) hostel = h.charAt(0).toUpperCase() + h.slice(1);
    });
    if (!groups[hostel]) groups[hostel] = [];
    groups[hostel].push(order);
  });
  return groups;
}

function getBatches(hostelGroups) {
  const batches = [];
  Object.entries(hostelGroups).forEach(([hostel, orders]) => {
    // Only include orders older than BATCH_WAIT_MINUTES
    const eligible = orders.filter(o => {
      const ageMs = Date.now() - new Date(o.created_date).getTime();
      return ageMs >= BATCH_WAIT_MINUTES * 60 * 1000;
    });
    for (let i = 0; i < eligible.length; i += MAX_BATCH_SIZE) {
      batches.push({ hostel, orders: eligible.slice(i, i + MAX_BATCH_SIZE) });
    }
  });
  return batches;
}

export default function BatchDeliveryManager() {
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningBatch, setAssigningBatch] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [orders, partners] = await Promise.all([
      base44.entities.Order.filter({ status: "confirmed" }, "-created_date", 100).catch(() => []),
      base44.entities.DeliveryPerson.filter({ is_available: true }, null, 50).catch(() => []),
    ]);
    const unassigned = orders.filter(o => !o.delivery_person_id);
    setUnassignedOrders(unassigned);
    setDeliveryPartners(partners.filter(p => !p.is_blocked));
    const groups = groupOrdersByHostel(unassigned);
    setBatches(getBatches(groups));
    setLastRefresh(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const assignBatch = async (batch, batchIdx) => {
    const partnerId = selectedPartner[batchIdx];
    if (!partnerId) return;
    setAssigningBatch(batchIdx);
    const partner = deliveryPartners.find(p => p.id === partnerId);
    try {
      await Promise.all(
        batch.orders.map(order =>
          base44.entities.Order.update(order.id, {
            delivery_person_id: partnerId,
            status: "preparing"
          })
        )
      );
      // Update partner's current_orders
      const existingOrders = partner.current_orders || [];
      const newOrders = [...existingOrders, ...batch.orders.map(o => o.id)];
      await base44.entities.DeliveryPerson.update(partnerId, { current_orders: newOrders });
      // Notify partner
      await base44.entities.Notification.create({
        user_id: partnerId,
        title: `Batch Assigned: ${batch.orders.length} orders`,
        message: `You have been assigned ${batch.orders.length} orders for ${batch.hostel} hostel.`,
        type: "info"
      }).catch(() => {});
      setSuccessMsg(`Batch of ${batch.orders.length} orders assigned to ${partner.name}!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadData();
    } catch {
      // silently retry
      await loadData();
    }
    setAssigningBatch(null);
  };

  // Auto-assign: assign oldest unassigned single order to any available partner (fallback)
  const autoAssignSingle = async (order) => {
    const partner = deliveryPartners[0];
    if (!partner) return;
    await base44.entities.Order.update(order.id, { delivery_person_id: partner.id, status: "preparing" });
    const newOrders = [...(partner.current_orders || []), order.id];
    await base44.entities.DeliveryPerson.update(partner.id, { current_orders: newOrders });
    setSuccessMsg(`Order #${order.order_number} auto-assigned to ${partner.name}`);
    setTimeout(() => setSuccessMsg(""), 4000);
    await loadData();
  };

  const pendingTooLong = unassignedOrders.filter(o => {
    const ageMs = Date.now() - new Date(o.created_date).getTime();
    return ageMs > 20 * 60 * 1000; // >20 minutes
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" /> Batch Delivery Manager
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Orders wait {BATCH_WAIT_MINUTES} min, then grouped by hostel (max {MAX_BATCH_SIZE}/batch)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh {lastRefresh && <span className="ml-1 text-xs text-gray-400">{lastRefresh.toLocaleTimeString()}</span>}
        </Button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-800 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Unassigned Orders", value: unassignedOrders.length, color: "text-orange-600" },
          { label: "Ready Batches", value: batches.length, color: "text-blue-600" },
          { label: "Available Partners", value: deliveryPartners.length, color: "text-emerald-600" },
          { label: "Overdue (>20 min)", value: pendingTooLong.length, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue alert */}
      {pendingTooLong.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" /> {pendingTooLong.length} order(s) waiting over 20 minutes!
          </div>
          {pendingTooLong.map(order => (
            <div key={order.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
              <span className="font-medium">#{order.order_number} — {order.delivery_address}</span>
              <Button size="sm" variant="destructive" onClick={() => autoAssignSingle(order)} disabled={deliveryPartners.length === 0}>
                Auto-Assign
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Batches */}
      {batches.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {unassignedOrders.length === 0
                ? "No unassigned orders right now."
                : `${unassignedOrders.length} order(s) waiting — batches ready after ${BATCH_WAIT_MINUTES} minutes.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch, idx) => (
            <Card key={idx} className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">{batch.hostel}</Badge>
                  <span>{batch.orders.length} order{batch.orders.length > 1 ? "s" : ""} in batch</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {batch.orders.map(order => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-3 text-sm flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">#{order.order_number}</span>
                        <span className="text-gray-500 ml-2">{order.customer_name}</span>
                        <span className="text-gray-400 ml-2">· {order.delivery_address}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-emerald-600">₹{order.total_amount?.toFixed(0)}</span>
                        {order.is_paid
                          ? <Badge className="bg-green-100 text-green-700 text-[10px]">PAID</Badge>
                          : <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">COD</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <Select
                    value={selectedPartner[idx] || ""}
                    onValueChange={val => setSelectedPartner(prev => ({ ...prev, [idx]: val }))}
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Select delivery partner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPartners.length === 0 ? (
                        <SelectItem value="none" disabled>No partners available</SelectItem>
                      ) : (
                        deliveryPartners.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              {p.name}
                              {p.assigned_hostel && p.assigned_hostel !== "All" && (
                                <span className="text-xs text-gray-400">({p.assigned_hostel})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => assignBatch(batch, idx)}
                    disabled={!selectedPartner[idx] || assigningBatch === idx}
                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                  >
                    {assigningBatch === idx ? (
                      <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Assigning…</>
                    ) : (
                      <><Truck className="w-4 h-4 mr-1" />Assign Batch</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}