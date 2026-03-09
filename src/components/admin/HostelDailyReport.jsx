import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, RefreshCw, TrendingUp, Users } from "lucide-react";

const HOSTELS = ["Mithali", "Gavaskar", "Virat", "Tendulkar"];

function extractHostel(address) {
  if (!address) return "Other";
  for (const h of HOSTELS) {
    if (address.toLowerCase().includes(h.toLowerCase())) return h;
  }
  return "Other";
}

export default function HostelDailyReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [orders, setOrders] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    const [allOrders, persons] = await Promise.all([
      base44.entities.Order.filter({ status: "delivered" }, "-updated_date", 500).catch(() => []),
      base44.entities.DeliveryPerson.list().catch(() => [])
    ]);

    // Filter by selected date (use updated_date as delivery completion date)
    const dayOrders = allOrders.filter(o => {
      const d = new Date(o.updated_date || o.created_date);
      return d.toISOString().split("T")[0] === selectedDate;
    });

    setOrders(dayOrders);
    setDeliveryPersons(persons);
    setIsLoading(false);
  };

  // Build report: { hostel -> { dpId -> stats } }
  const reportMap = {};
  orders.forEach(order => {
    const hostel = extractHostel(order.delivery_address);
    if (!reportMap[hostel]) reportMap[hostel] = {};

    const dpId = order.delivery_person_id || "__unassigned__";
    if (!reportMap[hostel][dpId]) {
      const dp = deliveryPersons.find(p => p.id === dpId);
      reportMap[hostel][dpId] = {
        name: dp?.name || "Unassigned",
        orders: 0,
        total_amount: 0,
        cod_amount: 0,
        online_amount: 0,
        commission: 0
      };
    }
    const row = reportMap[hostel][dpId];
    const amt = order.total_amount || 0;
    row.orders++;
    row.total_amount += amt;
    row.commission += amt * 0.10;
    if (order.payment_method === "cash") row.cod_amount += amt;
    else row.online_amount += amt;
  });

  const hostelRows = Object.entries(reportMap).map(([hostel, personsMap]) => {
    const persons = Object.values(personsMap);
    const totals = persons.reduce((acc, p) => ({
      orders: acc.orders + p.orders,
      total_amount: acc.total_amount + p.total_amount,
      cod_amount: acc.cod_amount + p.cod_amount,
      online_amount: acc.online_amount + p.online_amount,
      commission: acc.commission + p.commission,
    }), { orders: 0, total_amount: 0, cod_amount: 0, online_amount: 0, commission: 0 });
    return { hostel, persons, totals };
  });

  const grand = hostelRows.reduce((acc, h) => ({
    orders: acc.orders + h.totals.orders,
    total_amount: acc.total_amount + h.totals.total_amount,
    cod_amount: acc.cod_amount + h.totals.cod_amount,
    online_amount: acc.online_amount + h.totals.online_amount,
    commission: acc.commission + h.totals.commission,
  }), { orders: 0, total_amount: 0, cod_amount: 0, online_amount: 0, commission: 0 });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-sm">Report Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-44 mt-1"
          />
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Grand Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Orders", value: grand.orders, color: "text-gray-800" },
          { label: "Total Revenue", value: `₹${grand.total_amount.toFixed(0)}`, color: "text-emerald-600" },
          { label: "COD Cash", value: `₹${grand.cod_amount.toFixed(0)}`, color: "text-orange-600" },
          { label: "Online Paid", value: `₹${grand.online_amount.toFixed(0)}`, color: "text-blue-600" },
          { label: "Commission", value: `₹${grand.commission.toFixed(0)}`, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hostelRows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No delivered orders found for {selectedDate}</p>
          </CardContent>
        </Card>
      ) : (
        hostelRows.map(({ hostel, persons, totals }) => (
          <Card key={hostel} className="overflow-hidden">
            <CardHeader className="pb-3 bg-purple-50 border-b border-purple-100">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span className="text-purple-800">{hostel} Hostel</span>
                <div className="ml-auto flex flex-wrap gap-1.5 text-xs font-normal">
                  <Badge className="bg-gray-100 text-gray-700">
                    <Users className="w-3 h-3 mr-1" />{persons.length} partner{persons.length > 1 ? "s" : ""}
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">{totals.orders} orders</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">₹{totals.total_amount.toFixed(0)}</Badge>
                  <Badge className="bg-orange-100 text-orange-700">COD ₹{totals.cod_amount.toFixed(0)}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Delivery Partner</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persons.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center">{p.orders}</TableCell>
                      <TableCell className="font-semibold text-emerald-700">₹{p.total_amount.toFixed(0)}</TableCell>
                      <TableCell>
                        {p.cod_amount > 0
                          ? <span className="text-orange-600 font-medium">₹{p.cod_amount.toFixed(0)}</span>
                          : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {p.online_amount > 0
                          ? <span className="text-blue-600 font-medium">₹{p.online_amount.toFixed(0)}</span>
                          : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-purple-700 font-medium">₹{p.commission.toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Hostel total */}
                  <TableRow className="bg-gray-50 font-semibold border-t-2">
                    <TableCell className="text-gray-700">Hostel Total</TableCell>
                    <TableCell className="text-center">{totals.orders}</TableCell>
                    <TableCell className="text-emerald-700">₹{totals.total_amount.toFixed(0)}</TableCell>
                    <TableCell className="text-orange-700">₹{totals.cod_amount.toFixed(0)}</TableCell>
                    <TableCell className="text-blue-700">₹{totals.online_amount.toFixed(0)}</TableCell>
                    <TableCell className="text-purple-700">₹{totals.commission.toFixed(0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}