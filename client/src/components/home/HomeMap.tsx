import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    ymaps: any;
  }
}

export function HomeMap({ salons }: { salons: Salon[] }) {
  const { t, i18n } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapContainerEl, setMapContainerEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any = null;

    const initMap = () => {
      if (!mapContainerEl || !window.ymaps) return;

      try {
        window.ymaps.ready(() => {
          // Create map centered on Tashkent
          map = new window.ymaps.Map(mapContainerEl, {
            center: [41.2995, 69.2401], // Tashkent coordinates
            zoom: 11,
            controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
          });

          // Add markers for each salon
          if (salons && salons.length > 0) {
            const bounds: number[][] = [];

            salons.forEach((salon) => {
              if (salon.latitude && salon.longitude) {
                const coords = [Number(salon.latitude), Number(salon.longitude)];
                bounds.push(coords);

                const placemark = new window.ymaps.Placemark(
                  coords,
                  {
                    balloonContent: `
                      <div style="padding: 16px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #1a1a1a; font-family: serif;">
                          ${getLocalizedText(salon.name as any, i18n.language) || "Salon"}
                        </h3>
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; display: flex; align-items: center; gap: 6px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          ${getLocalizedText(salon.city as any, i18n.language) || "City"}
                        </p>
                        ${
                          salon.averageRating
                            ? `
                          <p style="margin: 0 0 16px 0; font-size: 14px; color: #fbbf24; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            ⭐ ${Number(salon.averageRating).toFixed(1)} <span style="color: #999; font-weight: 400;">(${salon.reviewCount || 0} ${t("marketplace.salon.reviews")})</span>
                          </p>
                        `
                            : ""
                        }
                        <a href="/salon/${salon.id}" style="display: block; width: 100%; text-align: center; padding: 10px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; transition: background 0.2s;">
                          ${t("marketplace.salon.viewDetails")}
                        </a>
                      </div>
                    `,
                    hintContent: getLocalizedText(salon.name as any, i18n.language) || "Salon",
                  },
                  {
                    preset: "islands#violetDotIcon",
                    iconColor: "#8b5cf6",
                    hideIconOnBallonOpen: false,
                    balloonOffset: [0, -30],
                  },
                );
                map.geoObjects.add(placemark);
              }
            });

            // Fit map to show all salons
            if (bounds.length > 1) {
              map.setBounds(bounds, {
                checkZoomRange: true,
                zoomMargin: 50,
              });
            } else if (bounds.length === 1) {
              map.setCenter(bounds[0], 13);
            }
          }

          setMapLoaded(true);
        });
      } catch (error) {
        logger.error("Map initialization error", error as Error, { source: "HomeMap" });
        setMapError(true);
      }
    };

    // Load Yandex Maps API
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";
    const lang = i18n.language === "uz" ? "ru_RU" : i18n.language === "ru" ? "ru_RU" : "en_US";

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');

    if (existingScript) {
      if (window.ymaps) {
        initMap();
      } else {
        existingScript.addEventListener("load", initMap);
      }
    } else {
      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=${lang}`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        logger.error("Failed to load Yandex Maps", new Error("Yandex Maps API failed to load"), {
          source: "HomeMap",
        });
        setMapError(true);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (map) {
        try {
          map.destroy();
        } catch (e) {
          logger.error("Error destroying map", e as Error, { source: "HomeMap" });
        }
      }
    };
  }, [salons, i18n.language, mapContainerEl]);

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
            <div ref={setMapContainerEl} className="w-full h-full" />

            {!mapLoaded && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10 transition-opacity duration-500">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <MapPin className="h-20 w-20 text-primary opacity-20 absolute inset-0 animate-ping" />
                    <MapPin className="h-20 w-20 text-primary relative z-10" />
                  </div>
                  <p className="text-foreground font-medium text-lg">
                    {t("marketplace.map.loading")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 tracking-wide font-light">
                    Инициализация Яндекс.Карт...
                  </p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-md z-10">
                <div className="text-center p-10 max-w-md bg-white rounded-3xl shadow-xl">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin className="h-8 w-8 text-rose-500" />
                  </div>
                  <p className="text-foreground font-semibold text-xl mb-3">
                    Ошибка загрузки карты
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    {t("marketplace.map.apiNote")}
                  </p>
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-bold">
                      Техническая информация
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      Check VITE_YANDEX_MAPS_API_KEY
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
