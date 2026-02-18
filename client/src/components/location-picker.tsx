import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { MapPin, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  className?: string;
}

// Component to handle map clicks and marker updates
function MapController({
  position,
  onPositionChange,
  onAddressChange,
}: {
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
  onAddressChange: (address: string) => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click: async (e) => {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      onPositionChange(newPos);

      // Reverse geocode using Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=ru`
        );
        const data = await response.json();
        if (data.display_name) {
          onAddressChange(data.display_name);
        }
      } catch (error) {
        logger.error("Reverse geocoding error", error as Error, { source: "location-picker" });
      }
    },
  });

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return null;
}

export function LocationPicker({
  latitude = 41.311081, // Default: Tashkent
  longitude = 69.240562,
  address = "",
  onLocationChange,
  className = "",
}: LocationPickerProps) {
  const [coords, setCoords] = useState<[number, number]>([latitude, longitude]);
  const [searchQuery, setSearchQuery] = useState(address);
  const [isSearching, setIsSearching] = useState(false);

  // Search for address using Nominatim
  const handleSearch = async () => {
    if (!searchQuery) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=ru`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newCoords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
        const newAddress = result.display_name;

        setCoords(newCoords);
        setSearchQuery(newAddress);

        onLocationChange({
          latitude: newCoords[0],
          longitude: newCoords[1],
          address: newAddress,
        });
      }
    } catch (error) {
      logger.error("Geocoding error", error as Error, { source: "location-picker" });
    } finally {
      setIsSearching(false);
    }
  };

  // Get current location
  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newCoords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCoords(newCoords);

          // Get address for current location
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newCoords[0]}&lon=${newCoords[1]}&accept-language=ru`
            );
            const data = await response.json();

            if (data.display_name) {
              const newAddress = data.display_name;
              setSearchQuery(newAddress);

              onLocationChange({
                latitude: newCoords[0],
                longitude: newCoords[1],
                address: newAddress,
              });
            }
          } catch (error) {
            logger.error("Reverse geocoding error", error as Error, { source: "location-picker" });
          }
        },
        (error) => {
          logger.error("Geolocation error", error as unknown, { source: "location-picker" });
        }
      );
    }
  };

  const handlePositionChange = (newPos: [number, number]) => {
    setCoords(newPos);
    onLocationChange({
      latitude: newPos[0],
      longitude: newPos[1],
      address: searchQuery,
    });
  };

  const handleAddressChange = (newAddress: string) => {
    setSearchQuery(newAddress);
    onLocationChange({
      latitude: coords[0],
      longitude: coords[1],
      address: newAddress,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label>Адрес</Label>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите адрес для поиска"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={isSearching}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGetCurrentLocation}
            title="Моё местоположение"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Нажмите на карту, чтобы указать точное местоположение
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <MapContainer
          center={coords}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={coords}
            draggable={true}
            eventHandlers={{
              dragend: async (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                const newPos: [number, number] = [position.lat, position.lng];

                setCoords(newPos);

                // Reverse geocode
                try {
                  const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&accept-language=ru`
                  );
                  const data = await response.json();

                  if (data.display_name) {
                    setSearchQuery(data.display_name);
                    onLocationChange({
                      latitude: newPos[0],
                      longitude: newPos[1],
                      address: data.display_name,
                    });
                  }
                } catch (error) {
                  logger.error("Reverse geocoding error", error as Error, {
                    source: "location-picker",
                  });
                }
              },
            }}
          />
          <MapController
            position={coords}
            onPositionChange={handlePositionChange}
            onAddressChange={handleAddressChange}
          />
        </MapContainer>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Координаты: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
        </p>
      </div>
    </div>
  );
}
