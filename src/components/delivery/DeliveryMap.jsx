import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, Package, User, MapPin, Store, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom marker icons
const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dhabaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DeliveryMap({ showAllDeliveryPersons = true, orderId = null }) {
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState({});
  const [orders, setOrders] = useState({});
  const [customerLocations, setCustomerLocations] = useState([]);
  const [dhabaLocations, setDhabaLocations] = useState([]);
  const [center, setCenter] = useState([28.6139, 77.2090]); // Default: Delhi

  useEffect(() => {
    loadLocations().catch(err => console.error("Map load error:", err));
    const interval = setInterval(() => {
      loadLocations().catch(err => console.error("Map refresh error:", err));
    }, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLocations = async () => {
    try {
      const locations = await base44.entities.DeliveryLocation.filter({
        is_active: true
      });
      
      if (locations.length === 0) {
        setDeliveryLocations([]);
        return;
      }
      
      setDeliveryLocations(locations);

      // Load only if we have locations
      const personIds = [...new Set(locations.map(l => l.delivery_person_id))].slice(0, 10);
      const personsData = await Promise.all(
        personIds.map(id => base44.entities.DeliveryPerson.filter({ id }).catch(() => []))
      );
      const personsMap = {};
      personsData.flat().forEach(person => {
        personsMap[person.id] = person;
      });
      setDeliveryPersons(personsMap);

      // Load orders (limited)
      const orderIds = orderId ? [orderId] : [...new Set(locations.map(l => l.order_id).filter(Boolean))].slice(0, 10);
      if (orderIds.length > 0) {
        const ordersData = await Promise.all(
          orderIds.map(id => base44.entities.Order.filter({ id }).catch(() => []))
        );
        const ordersMap = {};
        ordersData.flat().forEach(order => {
          ordersMap[order.id] = order;
        });
        setOrders(ordersMap);

        // Extract locations only for limited orders
        await extractOrderLocations(ordersData.flat());
      }

      // Set center to first active delivery person
      if (locations.length > 0) {
        setCenter([locations[0].latitude, locations[0].longitude]);
      }
    } catch (error) {
      console.error("Error loading delivery locations:", error);
    }
  };

  const extractOrderLocations = async (ordersList) => {
    const customers = [];
    const dhabas = [];
    
    // Limit processing
    const limitedOrders = ordersList.slice(0, 10);
    
    for (const order of limitedOrders) {
      const customerCoords = geocodeAddress(order.delivery_address);
      customers.push({
        orderId: order.id,
        orderNumber: order.order_number,
        address: order.delivery_address,
        customerName: order.customer_name,
        phone: order.phone_number,
        coords: customerCoords
      });

      // Limit items per order
      const items = (order.items || []).slice(0, 5);
      for (const item of items) {
        if (item.dhaba_name) {
          const dhabaCoords = geocodeDhaba(item.dhaba_name);
          if (!dhabas.find(d => d.name === item.dhaba_name)) {
            dhabas.push({
              name: item.dhaba_name,
              coords: dhabaCoords,
              items: [item.product_name]
            });
          } else {
            const existing = dhabas.find(d => d.name === item.dhaba_name);
            if (existing.items.length < 10 && !existing.items.includes(item.product_name)) {
              existing.items.push(item.product_name);
            }
          }
        }
      }
    }

    setCustomerLocations(customers);
    setDhabaLocations(dhabas);
  };

  // Simplified geocoding - returns Delhi area coordinates with variations
  const geocodeAddress = (address) => {
    const baseCoords = [28.6139, 77.2090];
    const hostelOffsets = {
      'Mithali': [0.005, 0.005],
      'Gavaskar': [-0.005, 0.005],
      'Virat': [0.005, -0.005],
      'Tendulkar': [-0.005, -0.005]
    };
    
    for (const [hostel, offset] of Object.entries(hostelOffsets)) {
      if (address.includes(hostel)) {
        return [baseCoords[0] + offset[0], baseCoords[1] + offset[1]];
      }
    }
    
    return [baseCoords[0] + (Math.random() - 0.5) * 0.01, baseCoords[1] + (Math.random() - 0.5) * 0.01];
  };

  const geocodeDhaba = (dhabaName) => {
    const baseCoords = [28.6139, 77.2090];
    const hash = dhabaName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [
      baseCoords[0] + ((hash % 100) - 50) * 0.0001,
      baseCoords[1] + ((hash % 100) - 50) * 0.0001
    ];
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openGoogleMaps = (destLat, destLng, label) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank');
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
            
            {/* Delivery Person Markers */}
            {deliveryLocations.map((location) => {
              const person = deliveryPersons[location.delivery_person_id];
              const order = location.order_id ? orders[location.order_id] : null;
              
              return (
                <React.Fragment key={location.id}>
                  <Marker 
                    position={[location.latitude, location.longitude]}
                    icon={deliveryIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
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

            {/* Customer Location Markers */}
            {customerLocations.map((customer, idx) => (
              <Marker 
                key={`customer-${idx}`}
                position={customer.coords}
                icon={customerIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <p className="font-bold text-red-600">Customer Location</p>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-semibold">Order:</span> #{customer.orderNumber}</p>
                      <p><span className="font-semibold">Name:</span> {customer.customerName}</p>
                      <p><span className="font-semibold">Phone:</span> {customer.phone}</p>
                      <p><span className="font-semibold">Address:</span> {customer.address}</p>
                      
                      {deliveryLocations.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="flex items-center gap-1 text-blue-600">
                            <Clock className="w-3 h-3" />
                            Distance: {calculateDistance(
                              deliveryLocations[0].latitude,
                              deliveryLocations[0].longitude,
                              customer.coords[0],
                              customer.coords[1]
                            ).toFixed(2)} km
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Est. Time: ~{Math.ceil(calculateDistance(
                              deliveryLocations[0].latitude,
                              deliveryLocations[0].longitude,
                              customer.coords[0],
                              customer.coords[1]
                            ) * 3)} mins
                          </p>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-red-600 hover:bg-red-700"
                        onClick={() => openGoogleMaps(customer.coords[0], customer.coords[1], customer.customerName)}
                      >
                        <Navigation className="w-3 h-3 mr-2" />
                        Navigate Here
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Dhaba Location Markers */}
            {dhabaLocations.map((dhaba, idx) => (
              <Marker 
                key={`dhaba-${idx}`}
                position={dhaba.coords}
                icon={dhabaIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="w-4 h-4 text-blue-600" />
                      <p className="font-bold text-blue-600">Pickup Location</p>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-semibold">Dhaba:</span> {dhaba.name}</p>
                      <p className="font-semibold mt-2">Items to pickup:</p>
                      <ul className="list-disc list-inside text-xs">
                        {dhaba.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      
                      {deliveryLocations.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="flex items-center gap-1 text-blue-600">
                            <Clock className="w-3 h-3" />
                            Distance: {calculateDistance(
                              deliveryLocations[0].latitude,
                              deliveryLocations[0].longitude,
                              dhaba.coords[0],
                              dhaba.coords[1]
                            ).toFixed(2)} km
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Est. Time: ~{Math.ceil(calculateDistance(
                              deliveryLocations[0].latitude,
                              deliveryLocations[0].longitude,
                              dhaba.coords[0],
                              dhaba.coords[1]
                            ) * 3)} mins
                          </p>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                        onClick={() => openGoogleMaps(dhaba.coords[0], dhaba.coords[1], dhaba.name)}
                      >
                        <Navigation className="w-3 h-3 mr-2" />
                        Navigate Here
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Draw route lines */}
            {deliveryLocations.length > 0 && dhabaLocations.length > 0 && (
              <Polyline
                positions={[
                  [deliveryLocations[0].latitude, deliveryLocations[0].longitude],
                  ...dhabaLocations.map(d => d.coords)
                ]}
                color="blue"
                weight={3}
                opacity={0.6}
                dashArray="10, 10"
              />
            )}
            {deliveryLocations.length > 0 && customerLocations.length > 0 && (
              <Polyline
                positions={[
                  [deliveryLocations[0].latitude, deliveryLocations[0].longitude],
                  ...customerLocations.map(c => c.coords)
                ]}
                color="red"
                weight={3}
                opacity={0.6}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>

        {deliveryLocations.length === 0 && customerLocations.length === 0 && dhabaLocations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active deliveries to track</p>
            <p className="text-sm mt-2">Accept an order and enable location tracking to see the map</p>
          </div>
        )}

        {/* Legend */}
        {(deliveryLocations.length > 0 || customerLocations.length > 0 || dhabaLocations.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Delivery Person ({deliveryLocations.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Customer ({customerLocations.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Dhaba Pickup ({dhabaLocations.length})</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}