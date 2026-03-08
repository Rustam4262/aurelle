import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  YMaps,
  Map,
  Placemark,
  Clusterer,
  ZoomControl,
  GeolocationControl,
} from "@pbe/react-yandex-maps";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";

const YANDEX_MAPS_API_KEY =
  import.meta.env.VITE_YANDEX_MAPS_API_KEY || "99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0";

// Map i18next language codes ("ru", "en", "uz") to the locale strings that
// the Yandex Maps API actually accepts. Passing a bare "ru" instead of "ru_RU"
// is silently ignored by the API and may result in wrong-language labels.
const YMAPS_LANG: Record<string, "ru_RU" | "en_US"> = {
  ru: "ru_RU",
  uz: "ru_RU", // Yandex has no Uzbek locale — Russian is the nearest fallback
  en: "en_US",
};

export function HomeMap({ salons }: { salons: Salon[] }) {
  const { t, i18n } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // If the map hasn't fired onLoad within 10 s, stop showing the loading
  // spinner and display a graceful error card instead of an infinite dark box.
  useEffect(() => {
    if (mapLoaded || mapError) return;
    const timer = setTimeout(() => setMapError(true), 10_000);
    return () => clearTimeout(timer);
  }, [mapLoaded, mapError]);

  const defaultCenter: [number, number] = [41.2995, 69.2401]; // Tashkent

  const salonsWithCoords = salons?.filter((s) => s.latitude && s.longitude) ?? [];

  const center: [number, number] =
    salonsWithCoords.length > 0
      ? [
          salonsWithCoords.reduce((sum, s) => sum + Number(s.latitude), 0) /
            salonsWithCoords.length,
          salonsWithCoords.reduce((sum, s) => sum + Number(s.longitude), 0) /
            salonsWithCoords.length,
        ]
      : defaultCenter;

  const ymapsLang = YMAPS_LANG[i18n.language] ?? "ru_RU";

  const createBalloonContent = (salon: Salon) => {
    const name =
      getLocalizedText(salon.name as { en?: string; ru?: string; uz?: string }, i18n.language) ||
      "Salon";
    const city = getLocalizedText(
      salon.city as { en?: string; ru?: string; uz?: string },
      i18n.language,
    );
    const hasRating = salon.averageRating && Number(salon.averageRating) > 0;

    return {
      balloonContentHeader: `
        <div style="font-family: system-ui; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0; color: #111827;">${name}</h3>
          ${city ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">📍 ${city}</p>` : ""}
        </div>
      `,
      balloonContentBody: `
        <div style="font-family: system-ui; padding: 16px;">
          ${
            salon.address
              ? `<div style="margin-bottom: 12px; font-size: 14px; color: #374151;">
                   <strong>${t("marketplace.home.map.address")}:</strong> ${salon.address}
                 </div>`
              : ""
          }
          ${
            hasRating
              ? `<div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg,#fef3c7,#fde68a); border-radius: 8px; border-left: 3px solid #f59e0b;">
                   <div style="display:flex; align-items:center; gap:8px;">
                     <span style="font-size:24px;">⭐</span>
                     <div>
                       <div style="font-size:18px; font-weight:700; color:#92400e;">${Number(salon.averageRating).toFixed(1)}</div>
                       <div style="font-size:12px; color:#78350f;">${salon.reviewCount || 0} ${t("marketplace.salon.reviews")}</div>
                     </div>
                   </div>
                 </div>`
              : ""
          }
          <a href="/salon/${salon.id}"
             style="display:block; text-align:center; padding:12px 24px; background:linear-gradient(135deg,#8b5cf6,#a78bfa); color:white; border-radius:12px; text-decoration:none; font-weight:600; font-size:14px;">
            ${t("marketplace.salon.viewDetails")} →
          </a>
        </div>
      `,
    };
  };

  return (
    <section
      className="py-10 md:py-20 bg-gradient-to-b from-background to-muted/30"
      data-testid="section-map"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 md:mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <MapPin className="h-4 w-4" />
            {t("marketplace.home.map.badge")}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground mb-3 font-light">
            {t("marketplace.map.title")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-light max-w-2xl mx-auto">
            {salonsWithCoords.length > 0
              ? t("marketplace.home.map.salonsOnMap", { count: salonsWithCoords.length })
              : t("marketplace.map.subtitle")}
          </p>
        </div>

        <Card
          className={`overflow-hidden border-border/50 shadow-2xl shadow-primary/5 rounded-2xl sm:rounded-3xl animate-in zoom-in duration-1000 transition-all ${
            isFullscreen ? "fixed inset-2 sm:inset-4 z-50" : "relative"
          }`}
        >
          {/* Fullscreen toggle — icon-only on mobile to save space */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFullscreen((v) => !v)}
            className="absolute top-3 right-3 z-10 rounded-full shadow-lg backdrop-blur-sm bg-background/90 hover:bg-background"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("marketplace.home.map.exitFullscreen")}</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("marketplace.home.map.fullscreen")}</span>
              </>
            )}
          </Button>

          {/*
           * Responsive heights prevent the map from being a massive dark block on mobile.
           * The previous fixed h-[550px] on all sizes was the root cause of the
           * "large empty black section" on phones (550px loading spinner in dark mode).
           */}
          <div
            className={`relative ${isFullscreen ? "h-full" : "h-[260px] sm:h-[380px] md:h-[500px] lg:h-[600px]"}`}
            data-testid="map-container"
          >
            {/* Loading spinner — hidden once onLoad fires */}
            {!mapLoaded && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-[1000]">
                <div className="text-center">
                  <div className="relative w-14 h-14 mx-auto mb-4">
                    <MapPin className="h-14 w-14 text-primary opacity-20 absolute inset-0 animate-ping" />
                    <MapPin className="h-14 w-14 text-primary relative z-10" />
                  </div>
                  <p className="text-foreground font-medium text-sm">
                    {t("marketplace.map.loading")}
                  </p>
                </div>
              </div>
            )}

            {/* Error state — shown when map fails to load or 10 s timeout fires */}
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[1000]">
                <div className="text-center px-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-foreground font-medium text-sm">
                    {t("marketplace.home.map.loadError", "Карта недоступна")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("marketplace.home.map.loadErrorDesc", "Проверьте подключение к интернету")}
                  </p>
                </div>
              </div>
            )}

            <YMaps query={{ apikey: YANDEX_MAPS_API_KEY, lang: ymapsLang }}>
              <Map
                defaultState={{
                  center,
                  zoom: salonsWithCoords.length > 0 ? 12 : 11,
                  controls: [],
                }}
                width="100%"
                height="100%"
                className="rounded-2xl sm:rounded-3xl"
                onLoad={() => setMapLoaded(true)}
                onError={() => setMapError(true)}
                options={{
                  suppressMapOpenBlock: true,
                  yandexMapDisablePoiInteractivity: true,
                }}
              >
                <ZoomControl options={{ position: { right: 10, top: 10 }, size: "small" }} />
                <GeolocationControl options={{ float: "left" }} />

                {salonsWithCoords.length > 0 && (
                  <Clusterer
                    options={{
                      preset: "islands#violetClusterIcons",
                      groupByCoordinates: false,
                      clusterDisableClickZoom: false,
                      clusterHideIconOnBalloonOpen: false,
                      geoObjectHideIconOnBalloonOpen: false,
                      clusterBalloonContentLayout: "cluster#balloonCarousel",
                      clusterBalloonPagerSize: 5,
                      clusterBalloonContentLayoutWidth: 300,
                      clusterBalloonContentLayoutHeight: 200,
                    }}
                  >
                    {salonsWithCoords.map((salon) => (
                      <Placemark
                        key={salon.id}
                        geometry={[Number(salon.latitude), Number(salon.longitude)]}
                        options={{
                          preset: "islands#violetDotIcon",
                          iconColor: "#8b5cf6",
                          hideIconOnBalloonOpen: false,
                        }}
                        properties={createBalloonContent(salon)}
                      />
                    ))}
                  </Clusterer>
                )}

                {salonsWithCoords.length === 0 && mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Card className="p-6 text-center max-w-sm bg-background/95 backdrop-blur-sm pointer-events-auto">
                      <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <h3 className="font-semibold text-base mb-1">
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

        {salonsWithCoords.length > 0 && (
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>{t("marketplace.home.map.beautySalon")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center font-bold">
                {salonsWithCoords.length > 9 ? "9+" : salonsWithCoords.length}
              </div>
              <span>{t("marketplace.home.map.salonCluster")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
