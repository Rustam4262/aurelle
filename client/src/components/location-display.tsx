import { useState } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  salonName = "Салон",
  className = "",
}: LocationDisplayProps) {
  const { toast } = useToast();
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Адрес скопирован",
      description: "Адрес успешно скопирован в буфер обмена",
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
                balloonContent: `<strong>${salonName}</strong><br/>${address}`,
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
            <p className="text-sm font-medium">Адрес:</p>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyAddress}
              title="Скопировать адрес"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openInYandexMaps}
              title="Открыть в Яндекс.Картах"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Координаты: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
