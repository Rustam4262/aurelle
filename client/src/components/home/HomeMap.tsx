import { useState } from "react";
import { useTranslation } from "react-i18next";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";

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

            <YMaps query={{ apikey: YANDEX_MAPS_API_KEY, lang: i18n.language }}>
              <Map
                defaultState={{ center, zoom: salons?.length > 0 ? 12 : 11 }}
                width="100%"
                height="550px"
                className="rounded-3xl"
                onLoad={() => setMapLoaded(true)}
              >
                {salons?.map((salon) => {
                  if (!salon.latitude || !salon.longitude) return null;

                  const position: [number, number] = [
                    Number(salon.latitude),
                    Number(salon.longitude),
                  ];

                  return (
                    <Placemark
                      key={salon.id}
                      geometry={position}
                      options={{
                        preset: "islands#violetDotIcon",
                        iconColor: "#8b5cf6",
                      }}
                      properties={{
                        balloonContentHeader: `<div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${
                          getLocalizedText(salon.name as any, i18n.language) || "Salon"
                        }</div>`,
                        balloonContentBody: `
                          <div style="padding: 8px 0;">
                            <p style="margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                              📍 ${salon.address}
                            </p>
                            ${
                              salon.averageRating
                                ? `<p style="color: #d97706; font-weight: 600; margin-bottom: 12px;">
                                ⭐ ${Number(salon.averageRating).toFixed(1)} (${salon.reviewCount || 0} ${t("marketplace.salon.reviews")})
                              </p>`
                                : ""
                            }
                            <a href="/salon/${salon.id}"
                               style="display: block; text-align: center; padding: 8px 16px; background: #8b5cf6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                              ${t("marketplace.salon.viewDetails")}
                            </a>
                          </div>
                        `,
                      }}
                    />
                  );
                })}
              </Map>
            </YMaps>
          </div>
        </Card>
      </div>
    </section>
  );
}
