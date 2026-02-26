import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { YMaps, Map, Placemark, Clusterer, ZoomControl, GeolocationControl } from "@pbe/react-yandex-maps";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Minimize2 } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0";

export function HomeMap({ salons }: { salons: Salon[] }) {
  const { t, i18n } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<any>(null);

  // Default center on Tashkent
  const defaultCenter: [number, number] = [41.2995, 69.2401];

  // Calculate center based on salons
  const center: [number, number] = salons?.length > 0
    ? [
        salons.reduce((sum, s) => sum + (Number(s.latitude) || 0), 0) / salons.length,
        salons.reduce((sum, s) => sum + (Number(s.longitude) || 0), 0) / salons.length,
      ]
    : defaultCenter;

  // Filter salons with valid coordinates
  const salonsWithCoords = salons?.filter(s => s.latitude && s.longitude) || [];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Create balloon content
  const createBalloonContent = (salon: Salon) => {
    const name = getLocalizedText(salon.name as any, i18n.language) || "Salon";
    const city = getLocalizedText(salon.city as any, i18n.language);
    const hasRating = salon.averageRating && Number(salon.averageRating) > 0;

    return {
      balloonContentHeader: `
        <div style="font-family: system-ui; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0; color: #111827;">
            ${name}
          </h3>
          ${city ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0; display: flex; align-items: center; gap: 4px;">📍 ${city}</p>` : ''}
        </div>
      `,
      balloonContentBody: `
        <div style="font-family: system-ui; padding: 16px;">
          ${salon.address ? `
            <div style="margin-bottom: 12px; font-size: 14px; color: #374151;">
              <strong>${t("marketplace.home.map.address")}:</strong> ${salon.address}
            </div>
          ` : ''}

          ${hasRating ? `
            <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 3px solid #f59e0b;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">⭐</span>
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: #92400e;">
                    ${Number(salon.averageRating).toFixed(1)}
                  </div>
                  <div style="font-size: 12px; color: #78350f;">
                    ${salon.reviewCount || 0} ${t("marketplace.salon.reviews")}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <a href="/salon/${salon.id}"
             style="display: block; text-align: center; padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.3); transition: all 0.2s;"
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 8px -1px rgba(139, 92, 246, 0.4)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(139, 92, 246, 0.3)';">
            ${t("marketplace.salon.viewDetails")} →
          </a>
        </div>
      `,
    };
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30" data-testid="section-map">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <MapPin className="h-4 w-4" />
            {t("marketplace.home.map.badge")}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3 font-light">
            {t("marketplace.map.title")}
          </h2>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto">
            {salonsWithCoords.length > 0
              ? t("marketplace.home.map.salonsOnMap", { count: salonsWithCoords.length })
              : t("marketplace.map.subtitle")
            }
          </p>
        </div>

        <Card className={`overflow-hidden border-border/50 shadow-2xl shadow-primary/5 rounded-3xl animate-in zoom-in duration-1000 transition-all ${
          isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'relative'
        }`}>
          {/* Fullscreen Toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-10 rounded-full shadow-lg backdrop-blur-sm bg-background/90 hover:bg-background"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                {t("marketplace.home.map.exitFullscreen")}
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                {t("marketplace.home.map.fullscreen")}
              </>
            )}
          </Button>

          <div className={`relative ${isFullscreen ? 'h-full' : 'h-[550px] md:h-[650px]'}`} data-testid="map-container">
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
                    {t("marketplace.home.map.loadingInteractive")}
                  </p>
                </div>
              </div>
            )}

            <YMaps query={{ apikey: YANDEX_MAPS_API_KEY, lang: i18n.language as "ru_RU" | "tr_TR" | "en_US" | "en_RU" | "ru_UA" | "uk_UA" }}>
              <Map
                instanceRef={mapRef}
                defaultState={{
                  center,
                  zoom: salonsWithCoords.length > 0 ? 12 : 11,
                  controls: [], // Remove default controls
                }}
                width="100%"
                height="100%"
                className="rounded-3xl"
                onLoad={() => setMapLoaded(true)}
                options={{
                  suppressMapOpenBlock: true, // Hide "Open in Yandex Maps" button
                  yandexMapDisablePoiInteractivity: true,
                }}
              >
                {/* Custom Controls */}
                <ZoomControl
                  options={{
                    position: { right: 10, top: 10 },
                    size: 'small',
                  }}
                />
                <GeolocationControl
                  options={{
                    float: 'left',
                  }}
                />

                {/* Clusterer for better performance with many markers */}
                {salonsWithCoords.length > 0 && (
                  <Clusterer
                    options={{
                      preset: 'islands#violetClusterIcons',
                      groupByCoordinates: false,
                      clusterDisableClickZoom: false,
                      clusterHideIconOnBalloonOpen: false,
                      geoObjectHideIconOnBalloonOpen: false,
                      clusterBalloonContentLayout: 'cluster#balloonCarousel',
                      clusterBalloonPagerSize: 5,
                      clusterBalloonContentLayoutWidth: 300,
                      clusterBalloonContentLayoutHeight: 200,
                    }}
                  >
                    {salonsWithCoords.map((salon) => {
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
                            hideIconOnBalloonOpen: false,
                          }}
                          properties={createBalloonContent(salon)}
                        />
                      );
                    })}
                  </Clusterer>
                )}

                {/* Empty state when no salons with coordinates */}
                {salonsWithCoords.length === 0 && mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Card className="p-8 text-center max-w-md bg-background/95 backdrop-blur-sm pointer-events-auto">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold text-lg mb-2">
                        {t("marketplace.home.map.noSalonsOnMap")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("marketplace.home.map.noSalonsDesc")}
                      </p>
                    </Card>
                  </div>
                )}
              </Map>
            </YMaps>
          </div>
        </Card>

        {/* Map Legend */}
        {salonsWithCoords.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
              <span>{t("marketplace.home.map.beautySalon")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center font-bold">
                {salonsWithCoords.length > 9 ? '9+' : salonsWithCoords.length}
              </div>
              <span>{t("marketplace.home.map.salonCluster")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
