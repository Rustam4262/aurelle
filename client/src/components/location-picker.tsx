import { useState, useEffect } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { MapPin, Search } from "lucide-react";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  className?: string;
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
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [ymaps, setYmaps] = useState<any>(null);

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";

  // Search for address
  const handleSearch = async () => {
    if (!ymaps || !searchQuery) return;

    try {
      const geocoder = ymaps.geocode(searchQuery, {
        results: 1,
      });

      const result = await geocoder;
      const firstGeoObject = result.geoObjects.get(0);

      if (firstGeoObject) {
        const newCoords = firstGeoObject.geometry.getCoordinates();
        const newAddress = firstGeoObject.getAddressLine();

        setCoords(newCoords);
        setSearchQuery(newAddress);

        onLocationChange({
          latitude: newCoords[0],
          longitude: newCoords[1],
          address: newAddress,
        });

        // Center map on new location
        if (mapInstance) {
          mapInstance.setCenter(newCoords, 15);
        }
      }
    } catch (error) {
      logger.error("Geocoding error", error as Error, { source: "location-picker" });
    }
  };

  // Handle map click
  const handleMapClick = async (e: any) => {
    if (!ymaps) return;

    const newCoords = e.get("coords") as [number, number];
    setCoords(newCoords);

    // Reverse geocode to get address
    try {
      const geocoder = ymaps.geocode(newCoords);
      const result = await geocoder;
      const firstGeoObject = result.geoObjects.get(0);

      if (firstGeoObject) {
        const newAddress = firstGeoObject.getAddressLine();
        setSearchQuery(newAddress);

        onLocationChange({
          latitude: newCoords[0],
          longitude: newCoords[1],
          address: newAddress,
        });
      }
    } catch (error) {
      logger.error("Reverse geocoding error", error as Error, { source: "location-picker" });
      // Still update coordinates even if address lookup fails
      onLocationChange({
        latitude: newCoords[0],
        longitude: newCoords[1],
        address: searchQuery,
      });
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
          if (ymaps) {
            try {
              const geocoder = ymaps.geocode(newCoords);
              const result = await geocoder;
              const firstGeoObject = result.geoObjects.get(0);

              if (firstGeoObject) {
                const newAddress = firstGeoObject.getAddressLine();
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
          }

          // Center map on current location
          if (mapInstance) {
            mapInstance.setCenter(newCoords, 15);
          }
        },
        (error) => {
          logger.error("Geolocation error", error as unknown, { source: "location-picker" });
        },
      );
    }
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
          <Button type="button" variant="outline" onClick={handleSearch}>
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
        <YMaps
          query={{
            apikey: apiKey,
            lang: "ru_RU",
          }}
        >
          <Map
            defaultState={{
              center: coords,
              zoom: 15,
            }}
            width="100%"
            height="400px"
            onClick={handleMapClick}
            onLoad={(ymapsInstance: any) => setYmaps(ymapsInstance)}
            instanceRef={(ref: any) => setMapInstance(ref)}
            modules={["geocode"]}
          >
            <Placemark
              geometry={coords}
              options={{
                preset: "islands#redDotIcon",
                draggable: true,
              }}
              onDragEnd={async (e: any) => {
                const newCoords = e.get("target").geometry.getCoordinates();
                setCoords(newCoords);

                // Reverse geocode
                if (ymaps) {
                  try {
                    const geocoder = ymaps.geocode(newCoords);
                    const result = await geocoder;
                    const firstGeoObject = result.geoObjects.get(0);

                    if (firstGeoObject) {
                      const newAddress = firstGeoObject.getAddressLine();
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
                }
              }}
            />
          </Map>
        </YMaps>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Координаты: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
        </p>
      </div>
    </div>
  );
}
