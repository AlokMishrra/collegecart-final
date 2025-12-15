import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LiveLocationTracker({ deliveryPersonId, orderId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        setLocation(newLocation);
        setError(null);

        // Update location in database
        try {
          const existingLocations = await base44.entities.DeliveryLocation.filter({
            delivery_person_id: deliveryPersonId
          });

          if (existingLocations.length > 0) {
            await base44.entities.DeliveryLocation.update(existingLocations[0].id, {
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              order_id: orderId || null,
              is_active: true
            });
          } else {
            await base44.entities.DeliveryLocation.create({
              delivery_person_id: deliveryPersonId,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              order_id: orderId || null,
              is_active: true
            });
          }
        } catch (err) {
          console.error("Error updating location:", err);
        }
      },
      (err) => {
        setError("Unable to get your location. Please enable location services.");
        console.error("Geolocation error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    // Mark as inactive in database
    try {
      const existingLocations = await base44.entities.DeliveryLocation.filter({
        delivery_person_id: deliveryPersonId
      });

      if (existingLocations.length > 0) {
        await base44.entities.DeliveryLocation.update(existingLocations[0].id, {
          is_active: false
        });
      }
    } catch (err) {
      console.error("Error stopping tracking:", err);
    }

    setIsTracking(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Live Location Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isTracking ? (
          <>
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
                Tracking Active
              </Badge>
            </div>

            {location && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Current Location</p>
                    <p className="text-gray-600">
                      Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={stopTracking}
              variant="outline"
              className="w-full"
            >
              Stop Tracking
            </Button>
          </>
        ) : (
          <Button
            onClick={startTracking}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Start Location Tracking
          </Button>
        )}

        <p className="text-xs text-gray-500 text-center">
          Your location will be shared with admins and customers for active deliveries
        </p>
      </CardContent>
    </Card>
  );
}