import { memo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/optimized-image";
import { getLocalizedText } from "@/lib/i18n";
import { MapPin, Star, Heart, Scissors, ChevronRight } from "lucide-react";
import type { Salon } from "@shared/schema";

export const SalonCard = memo(({ salon }: { salon: Salon }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(salon.name as any, currentLang);
  const description = getLocalizedText(salon.description as any, currentLang);
  const city = getLocalizedText(salon.city as any, currentLang);

  return (
    <Link href={`/salon/${salon.id}`}>
      <Card
        className="group overflow-hidden cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-500 ease-out"
        data-testid={`card-salon-${salon.id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden">
          {salon.photos && (salon.photos as string[])[0] ? (
            <OptimizedImage
              src={(salon.photos as string[])[0]}
              alt={name}
              fallback="/images/placeholder-salon.jpg"
              className="w-full h-full transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
              <Scissors className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          )}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white text-rose-500 rounded-full"
              onClick={(e) => {
                e.preventDefault();
              }}
              data-testid={`button-favorite-${salon.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          {salon.averageRating && Number(salon.averageRating) > 0 && (
            <div className="absolute bottom-3 left-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <Badge
                variant="secondary"
                className="bg-white/95 backdrop-blur-sm shadow-sm py-1 font-semibold text-primary"
              >
                <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                {Number(salon.averageRating).toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-serif text-lg text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
            {name || "Unnamed Salon"}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
            <span className="line-clamp-1 italic">{city || "Unknown Location"}</span>
          </div>
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 h-10 leading-relaxed font-light">
              {description}
            </p>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {salon.reviewCount || 0} {t("marketplace.salon.reviews")}
            </span>
            <span className="text-primary flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {t("marketplace.salon.viewDetails")}
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
});

SalonCard.displayName = "SalonCard";

export function HomeSalons({ salons, isLoading }: { salons: Salon[]; isLoading: boolean }) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <section className="py-20 bg-background" data-testid="section-salons">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded w-64 animate-pulse" />
              <div className="h-5 bg-muted rounded w-48 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/50">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="h-10 bg-muted rounded w-full animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="main-content" className="py-20 bg-background" data-testid="section-salons">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-6 flex-wrap mb-12">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3 font-light">
              {t("marketplace.salons.title")}
            </h2>
            <p className="text-muted-foreground text-lg font-light">
              {salons.length > 0 ? t("marketplace.salons.subtitle") : t("marketplace.salons.empty")}
            </p>
          </div>
          {salons.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-5 h-10 border-border/60 hover:border-primary/50"
                data-testid="button-sort-rating"
              >
                {t("marketplace.salons.sortRating")}
              </Button>
            </div>
          )}
        </div>

        {salons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : (
          <Card className="p-16 text-center border-dashed border-2 border-border/50 bg-muted/20 rounded-3xl animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Scissors className="h-10 w-10 text-muted-foreground opacity-40" />
            </div>
            <h3 className="font-serif text-2xl text-foreground mb-3 font-light">
              {t("marketplace.salons.noSalons")}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto font-light leading-relaxed">
              {t("marketplace.salons.beFirst")}
            </p>
            <Link href="/owner">
              <Button
                className="rounded-full px-8 h-12 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all font-medium"
                data-testid="button-register-salon-empty"
              >
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </section>
  );
}
