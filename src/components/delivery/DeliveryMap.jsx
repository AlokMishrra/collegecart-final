import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, Package, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function DeliveryMap({ showAllDeliveryPersons = true }) {
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState({});
  const [orders, setOrders] = useState({});
  const [center, setCenter] = useState([28.6139, 77.2090]); // Default: Delhi

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLocations = async () => {
    try {
      const locations = await base44.entities.DeliveryLocation.filter({
        is_active: true
      });
      setDeliveryLocations(locations);

      // Load delivery person details
      const personIds = [...new Set(locations.map(l => l.delivery_person_id))];
      const personsData = await Promise.all(
        personIds.map(id => base44.entities.DeliveryPerson.filter({ id }))
      );
      const personsMap = {};
      personsData.flat().forEach(person => {
        personsMap[person.id] = person;
      });
      setDeliveryPersons(personsMap);

      // Load order details
      const orderIds = [...new Set(locations.map(l => l.order_id).filter(Boolean))];
      const ordersData = await Promise.all(
        orderIds.map(id => base44.entities.Order.filter({ id }))
      );
      const ordersMap = {};
      ordersData.flat().forEach(order => {
        ordersMap[order.id] = order;
      });
      setOrders(ordersMap);

      // Set center to first active delivery person
      if (locations.length > 0) {
        setCenter([locations[0].latitude, locations[0].longitude]);
      }
    } catch (error) {
      console.error("Error loading delivery locations:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Live Delivery Tracking
          {deliveryLocations.length > 0 && (
            <Badge className="ml-2 bg-emerald-600">
              {deliveryLocations.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {deliveryLocations.map((location) => {
              const person = deliveryPersons[location.delivery_person_id];
              const order = location.order_id ? orders[location.order_id] : null;
              
              return (
                <React.Fragment key={location.id}>
                  <Marker position={[location.latitude, location.longitude]}>
                    <Popup>
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-emerald-600" />
                          <p className="font-semibold">{person?.name || "Delivery Person"}</p>
                        </div>
                        {order && (
                          <div className="flex items-start gap-2 text-sm">
                            <Package className="w-4 h-4 text-gray-600 mt-0.5" />
                            <div>
                              <p className="font-medium">Order #{order.order_number}</p>
                              <p className="text-gray-600">{order.delivery_address}</p>
                              <p className="text-emerald-600 font-medium mt-1">
                                ₹{order.total_amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Last updated: {new Date(location.updated_date).toLocaleTimeString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[location.latitude, location.longitude]}
                    radius={100}
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 }}
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {deliveryLocations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active delivery persons tracking location</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}