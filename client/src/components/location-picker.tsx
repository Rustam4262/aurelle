import { useState, useRef } from "react";
import { YMaps, Map, Placemark, GeolocationControl, SearchControl } from "@pbe/react-yandex-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { MapPin, Search } from "lucide-react";

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0";

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
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);

  // Search for address using Yandex Geocoder
  const handleSearch = async () => {
    if (!searchQuery || !ymapsRef.current) return;

    setIsSearching(true);
    try {
      const geocoder = ymapsRef.current.geocode(searchQuery);
      const res = await geocoder;
      const firstGeoObject = res.geoObjects.get(0);

      if (firstGeoObject) {
        const newCoords = firstGeoObject.geometry.getCoordinates() as [number, number];
        const newAddress = firstGeoObject.getAddressLine();

        setCoords(newCoords);
        setSearchQuery(newAddress);

        onLocationChange({
          latitude: newCoords[0],
          longitude: newCoords[1],
          address: newAddress,
        });

        if (mapRef.current) {
          mapRef.current.setCenter(newCoords, 15);
        }
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

          if (mapRef.current) {
            mapRef.current.setCenter(newCoords, 15);
          }

          // Get address for current location using Yandex geocoder
          if (ymapsRef.current) {
            try {
              const geocoder = ymapsRef.current.geocode(newCoords);
              const res = await geocoder;
              const firstGeoObject = res.geoObjects.get(0);

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
        },
        (error) => {
          logger.error("Geolocation error", error as unknown, { source: "location-picker" });
        }
      );
    }
  };

  const handleMapClick = async (e: any) => {
    const newCoords = e.get("coords") as [number, number];
    setCoords(newCoords);

    // Get address using Yandex geocoder
    if (ymapsRef.current) {
      try {
        const geocoder = ymapsRef.current.geocode(newCoords);
        const res = await geocoder;
        const firstGeoObject = res.geoObjects.get(0);

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
  };

  const handleMarkerDragEnd = async (e: any) => {
    const newCoords = e.get("target").geometry.getCoordinates() as [number, number];
    setCoords(newCoords);

    // Get address using Yandex geocoder
    if (ymapsRef.current) {
      try {
        const geocoder = ymapsRef.current.geocode(newCoords);
        const res = await geocoder;
        const firstGeoObject = res.geoObjects.get(0);

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
        <YMaps query={{ apikey: YANDEX_MAPS_API_KEY, lang: "ru_RU" }}>
          <Map
            defaultState={{ center: coords, zoom: 15 }}
            width="100%"
            height="400px"
            onClick={handleMapClick}
            instanceRef={mapRef}
            onLoad={(ymaps: any) => {
              ymapsRef.current = ymaps;
            }}
          >
            <Placemark
              geometry={coords}
              options={{
                preset: "islands#violetDotIcon",
                draggable: true,
              }}
              onDragEnd={handleMarkerDragEnd}
            />
            <GeolocationControl options={{ float: "left" }} />
            <SearchControl options={{ float: "right" }} />
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
