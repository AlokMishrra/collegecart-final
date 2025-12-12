import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle, Navigation, Loader2 } from "lucide-react";

export default function DeliveryAI({ deliveryPerson, orders }) {
  const [optimizations, setOptimizations] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (deliveryPerson && orders.length > 0) {
      loadOptimizations();
    }
  }, [deliveryPerson, orders]);

  const loadOptimizations = async () => {
    try {
      const opts = await Promise.all(
        orders.map(order => 
          base44.entities.DeliveryOptimization.filter({ order_id: order.id })
            .then(res => res[0])
        )
      );
      setOptimizations(opts.filter(Boolean));
    } catch (error) {
      console.error("Error loading optimizations:", error);
    }
  };

  const optimizeDeliveries = async () => {
    setIsOptimizing(true);
    try {
      const orderDetails = orders.map(o => ({
        id: o.id,
        address: o.delivery_address,
        customer: o.customer_name,
        items: o.items?.length || 0
      }));

      const prompt = `Optimize delivery route and predict delays for ${deliveryPerson.name}:

Orders to deliver:
${orderDetails.map((o, i) => `${i + 1}. ${o.address} (${o.items} items)`).join('\n')}

Current time: ${new Date().toLocaleTimeString()}
Weather: Clear
Traffic: Moderate

For EACH order provide:
1. Suggested delivery sequence
2. Estimated delay (minutes)
3. Delay risk level (none/low/medium/high)
4. Route optimization tips

Return JSON array:
[{
  "order_id": "id",
  "sequence": <number>,
  "suggested_route": "string",
  "estimated_delay_minutes": <number>,
  "delay_risk": "none|low|medium|high",
  "traffic_conditions": "string",
  "optimization_tips": "string"
}]`;

      const aiOptimization = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            optimizations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order_id: { type: "string" },
                  sequence: { type: "number" },
                  suggested_route: { type: "string" },
                  estimated_delay_minutes: { type: "number" },
                  delay_risk: { type: "string" },
                  traffic_conditions: { type: "string" },
                  optimization_tips: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save optimizations
      for (const opt of (aiOptimization.optimizations || [])) {
        const existing = await base44.entities.DeliveryOptimization.filter({ order_id: opt.order_id });
        
        if (existing.length > 0) {
          await base44.entities.DeliveryOptimization.update(existing[0].id, {
            delivery_person_id: deliveryPerson.id,
            suggested_route: opt.suggested_route,
            estimated_delay_minutes: opt.estimated_delay_minutes,
            delay_risk: opt.delay_risk,
            traffic_conditions: opt.traffic_conditions,
            optimization_date: new Date().toISOString()
          });
        } else {
          await base44.entities.DeliveryOptimization.create({
            order_id: opt.order_id,
            delivery_person_id: deliveryPerson.id,
            suggested_route: opt.suggested_route,
            estimated_delay_minutes: opt.estimated_delay_minutes,
            delay_risk: opt.delay_risk,
            traffic_conditions: opt.traffic_conditions,
            optimization_date: new Date().toISOString()
          });
        }

        // Notify customer if delay expected
        if (opt.delay_risk !== 'none' && opt.estimated_delay_minutes > 10) {
          const order = orders.find(o => o.id === opt.order_id);
          if (order) {
            await base44.entities.Notification.create({
              user_id: order.user_id,
              title: "Delivery Update",
              message: `Your order may be delayed by approximately ${opt.estimated_delay_minutes} minutes due to ${opt.traffic_conditions}. We're working to get it to you as soon as possible!`,
              type: "warning"
            });
          }
        }
      }

      loadOptimizations();
    } catch (error) {
      console.error("Error optimizing deliveries:", error);
    }
    setIsOptimizing(false);
  };

  const getDelayColor = (risk) => {
    switch(risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            AI Delivery Assistant
          </CardTitle>
          <Button onClick={optimizeDeliveries} disabled={isOptimizing} size="sm">
            {isOptimizing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MapPin className="w-3 h-3 mr-1" />}
            Optimize Route
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map(order => {
          const opt = optimizations.find(o => o.order_id === order.id);
          return (
            <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">#{order.order_number}</p>
                  <p className="text-sm text-gray-600">{order.delivery_address}</p>
                </div>
                {opt && (
                  <Badge className={getDelayColor(opt.delay_risk)}>
                    {opt.delay_risk === 'none' ? 'On Time' : `+${opt.estimated_delay_minutes}min`}
                  </Badge>
                )}
              </div>
              {opt && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p><MapPin className="w-3 h-3 inline mr-1" />{opt.suggested_route}</p>
                  <p><Clock className="w-3 h-3 inline mr-1" />{opt.traffic_conditions}</p>
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <p className="text-center text-gray-500 py-4">No active deliveries</p>
        )}
      </CardContent>
    </Card>
  );
}