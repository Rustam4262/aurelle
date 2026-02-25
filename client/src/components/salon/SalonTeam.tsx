import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { MasterPortfolio } from "@/components/master-portfolio";
import { getLocalizedText } from "@/lib/i18n";
import type { Master, Service } from "@shared/schema";

export function MasterCard({
  master,
  onBook,
}: {
  master: Master;
  onBook: (master: Master) => void;
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [showPortfolio, setShowPortfolio] = useState(false);

  const specialties = master.specialties as { en?: string[]; ru?: string[]; uz?: string[] } | null;
  const specs = specialties
    ? specialties[currentLang as keyof typeof specialties] || specialties.en || []
    : [];
  const bio = getLocalizedText(master.bio as any, currentLang);

  return (
    <Card className="p-4 transition-all hover:shadow-md" data-testid={`card-master-${master.id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
          {master.photo && <AvatarImage src={master.photo} alt={master.name} />}
          <AvatarFallback className="bg-primary/10 text-primary">
            {master.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{master.name}</h3>
          {specs.length > 0 && (
            <p className="text-primary text-sm mb-1 truncate">{specs.join(", ")}</p>
          )}
          {master.experience && (
            <p className="text-muted-foreground text-sm mb-2">
              {master.experience} {t("marketplace.salon.experience")}
            </p>
          )}
          {bio && <p className="text-muted-foreground text-sm line-clamp-2">{bio}</p>}
          {master.averageRating && Number(master.averageRating) > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-amber-500 font-medium">
              <Star className="h-3 w-3 fill-amber-500" />
              <span>{Number(master.averageRating).toFixed(1)}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPortfolio(!showPortfolio)}
            className="px-0 mt-2 underline text-primary hover:text-primary/80 h-auto p-0"
          >
            {showPortfolio ? t("portfolio.hide") : t("portfolio.show")}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 transition-all hover:bg-primary hover:text-primary-foreground"
          onClick={() => onBook(master)}
          data-testid={`button-book-master-${master.id}`}
        >
          {t("marketplace.salon.bookNow")}
        </Button>
      </div>
      {showPortfolio && (
        <div className="mt-4 pt-4 border-t animate-in fade-in duration-300">
          <h4 className="font-medium text-sm mb-3">{t("portfolio.title")}</h4>
          <MasterPortfolio masterId={master.id} masterName={master.name} />
        </div>
      )}
    </Card>
  );
}

export function SalonTeam({
  masters,
  services,
  onBookService,
}: {
  masters: Master[] | undefined;
  services: Service[] | undefined;
  onBookService: (service: Service, master: Master) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {masters && masters.length > 0 ? (
        masters.map((master) => (
          <MasterCard
            key={master.id}
            master={master}
            onBook={(m) => {
              if (services && services.length > 0) {
                onBookService(services[0], m);
              }
            }}
          />
        ))
      ) : (
        <Card className="p-8 text-center bg-muted/30">
          <p className="text-muted-foreground">
            {t("marketplace.salon.noMasters") || t("team.noMembers")}
          </p>
        </Card>
      )}
    </div>
  );
}
