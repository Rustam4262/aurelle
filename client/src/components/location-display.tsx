import { useState } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface LocationDisplayProps {
  latitude: number;
  longitude: number;
  address: string;
  salonName?: string;
  className?: string;
}

export function LocationDisplay({
  latitude,
  longitude,
  address,
  salonName,
  className = "",
}: LocationDisplayProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";
  const displayName = salonName ?? t("location.salon");

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast({
      title: t("location.addressCopied"),
      description: t("location.addressCopiedDesc"),
    });
  };

  const openInYandexMaps = () => {
    const url = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
    window.open(url, "_blank");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border rounded-lg overflow-hidden">
        <YMaps
          query={{
            apikey: apiKey,
            lang: "ru_RU",
          }}
        >
          <Map
            defaultState={{
              center: [latitude, longitude],
              zoom: 15,
            }}
            width="100%"
            height="300px"
          >
            <Placemark
              geometry={[latitude, longitude]}
              properties={{
                balloonContent: `<strong>${displayName}</strong><br/>${address}`,
              }}
              options={{
                preset: "islands#redDotIcon",
              }}
            />
          </Map>
        </YMaps>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium">{t("location.address")}</p>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyAddress}
              title={t("location.copyAddress")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openInYandexMaps}
              title={t("location.openInYandex")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("location.coordinates")} {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
