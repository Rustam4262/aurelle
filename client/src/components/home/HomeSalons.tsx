import { memo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/optimized-image";
import { getLocalizedText } from "@/lib/i18n";
import { pluralRu } from "@/lib/plural";
import { MapPin, Star, Heart, Scissors, ChevronRight } from "lucide-react";
import type { Salon } from "@shared/schema";

export const SalonCard = memo(({ salon }: { salon: Salon }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(
    salon.name as { en?: string; ru?: string; uz?: string },
    currentLang,
  );
  const description = getLocalizedText(
    salon.description as { en?: string; ru?: string; uz?: string },
    currentLang,
  );
  const city = salon.city ?? "";

  return (
    <Link href={`/salon/${salon.id}`}>
      <Card
        className="lift group relative cursor-pointer overflow-hidden rounded-[1.75rem] border-foreground/[0.06] p-2"
        data-testid={`card-salon-${salon.id}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem]">
          {salon.photos && (salon.photos as string[])[0] ? (
            <OptimizedImage
              src={(salon.photos as string[])[0]}
              alt={name}
              fallback="/images/placeholder-salon.svg"
              className="h-full w-full transition-transform [transition-duration:1200ms] ease-out-expo group-hover:scale-110"
            />
          ) : (
            // Branded placeholder instead of a flat grey box
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_80%_at_20%_10%,hsl(340_80%_60%/0.35),transparent_60%),radial-gradient(100%_70%_at_90%_90%,hsl(15_90%_62%/0.3),transparent_60%)] bg-muted">
              <span className="font-serif text-7xl font-light text-foreground/25 transition-transform duration-700 group-hover:scale-110">
                {(name || "A").charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            {salon.averageRating && Number(salon.averageRating) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {Number(salon.averageRating).toFixed(1)}
              </span>
            ) : (
              <span />
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white hover:text-rose-500"
              onClick={(e) => {
                e.preventDefault();
              }}
              aria-label="favorite"
              data-testid={`button-favorite-${salon.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-serif text-2xl leading-tight text-white line-clamp-2">
              {name || t("marketplace.salon.unnamed")}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-1">
                {city || t("marketplace.salon.unknownLocation")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-4">
          <div className="min-w-0">
            {description && (
              <p className="line-clamp-1 text-sm text-muted-foreground">{description}</p>
            )}
            <span className="text-xs font-medium text-muted-foreground/80">
              {salon.reviewCount || 0}{" "}
              {i18n.language === "ru"
                ? pluralRu(salon.reviewCount || 0, ["отзыв", "отзыва", "отзывов"])
                : t("marketplace.salon.reviews")}
            </span>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-500 ease-out-expo group-hover:rotate-[-45deg] group-hover:bg-primary group-hover:text-primary-foreground">
            <ChevronRight className="h-5 w-5" />
          </span>
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
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              AURELLE · {t("marketplace.salons.sortRating")}
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-3 font-light tracking-[-0.01em]">
              {t("marketplace.salons.title")}
            </h2>
            <p className="text-muted-foreground text-lg font-light">
              {salons.length > 0 ? t("marketplace.salons.subtitle") : t("audience.empty")}
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {salons.map((salon, i) => (
              <div
                key={salon.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 90}ms` }}
              >
                <SalonCard salon={salon} />
              </div>
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
              {t("audience.catalogHint")}
            </p>
            <Link href="/search?audience=all">
              <Button
                className="rounded-full px-8 h-12 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all font-medium"
                data-testid="button-register-salon-empty"
              >
                {t("audience.catalog")}
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </section>
  );
}

