import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Leaflet + Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom purple marker icon
const purpleIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
      <path fill="#8b5cf6" stroke="#fff" stroke-width="1.5" d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z"/>
      <circle cx="12" cy="8" r="3" fill="#fff"/>
    </svg>
  `)}`,
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
});

export function HomeMap({ salons }: { salons: Salon[] }) {
  const { t, i18n } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Default center on Tashkent
  const defaultCenter: [number, number] = [41.2995, 69.2401];

  // Calculate center based on salons
  const center: [number, number] = salons?.length > 0
    ? [
        salons.reduce((sum, s) => sum + (Number(s.latitude) || 0), 0) / salons.length,
        salons.reduce((sum, s) => sum + (Number(s.longitude) || 0), 0) / salons.length,
      ]
    : defaultCenter;

  useEffect(() => {
    // Mark map as loaded after component mounts
    setTimeout(() => setMapLoaded(true), 100);
  }, []);

  return (
    <section className="py-20 bg-muted/30" data-testid="section-map">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3 font-light">
            {t("marketplace.map.title")}
          </h2>
          <p className="text-muted-foreground text-lg font-light">
            {t("marketplace.map.subtitle")}
          </p>
        </div>

        <Card className="overflow-hidden border-border/50 shadow-2xl shadow-primary/5 rounded-3xl animate-in zoom-in duration-1000">
          <div className="h-[550px] relative" data-testid="map-container">
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-[1000]">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <MapPin className="h-20 w-20 text-primary opacity-20 absolute inset-0 animate-ping" />
                    <MapPin className="h-20 w-20 text-primary relative z-10" />
                  </div>
                  <p className="text-foreground font-medium text-lg">
                    {t("marketplace.map.loading")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 tracking-wide font-light">
                    Загрузка карты...
                  </p>
                </div>
              </div>
            )}

            <MapContainer
              center={center}
              zoom={salons?.length > 0 ? 12 : 11}
              scrollWheelZoom={true}
              className="h-full w-full rounded-3xl"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {salons?.map((salon) => {
                if (!salon.latitude || !salon.longitude) return null;

                const position: [number, number] = [
                  Number(salon.latitude),
                  Number(salon.longitude),
                ];

                return (
                  <Marker key={salon.id} position={position} icon={purpleIcon}>
                    <Popup className="custom-popup" maxWidth={300}>
                      <div className="p-4">
                        <h3 className="font-serif text-lg font-semibold mb-2">
                          {getLocalizedText(salon.name as any, i18n.language) || "Salon"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {salon.address}
                        </p>
                        {salon.averageRating && (
                          <p className="text-sm text-yellow-600 font-semibold mb-3">
                            ⭐ {Number(salon.averageRating).toFixed(1)} ({salon.reviewCount || 0}{" "}
                            {t("marketplace.salon.reviews")})
                          </p>
                        )}
                        <a
                          href={`/salon/${salon.id}`}
                          className="block w-full text-center py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                          {t("marketplace.salon.viewDetails")}
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
