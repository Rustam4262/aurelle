import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { getLocalizedText, formatCurrency } from "@/lib/i18n";
import type { Service } from "@shared/schema";

export function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: (service: Service) => void;
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(service.name as any, currentLang);
  const description = getLocalizedText(service.description as any, currentLang);

  return (
    <Card
      className="p-4 transition-all hover:shadow-md group"
      data-testid={`card-service-${service.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {String(service.duration)} {t("marketplace.salon.minutes")}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">{formatCurrency(service.priceMin)}</p>
          <Button
            size="sm"
            className="mt-2 transition-all hover:scale-105"
            onClick={() => onBook(service)}
            data-testid={`button-book-service-${service.id}`}
          >
            {t("marketplace.salon.bookNow")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SalonServices({
  services,
  onBook,
}: {
  services: Service[] | undefined;
  onBook: (service: Service) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {services && services.length > 0 ? (
        services.map((service) => (
          <ServiceCard key={service.id} service={service} onBook={onBook} />
        ))
      ) : (
        <Card className="p-8 text-center bg-muted/30">
          <p className="text-muted-foreground">{t("marketplace.salon.noServices")}</p>
        </Card>
      )}
    </div>
  );
}
