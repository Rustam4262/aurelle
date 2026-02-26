import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, User, ChevronRight, ArrowRight } from "lucide-react";

interface PublicMaster {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  city: string | null;
  serviceMode: string | null;
  specialties: { en: string[]; ru: string[]; uz: string[] } | null;
  averageRating: string | null;
  reviewCount: number | null;
  experience: number | null;
}

function MasterPreviewCard({ master }: { master: PublicMaster }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language as "en" | "ru" | "uz";
  const specialties = master.specialties?.[lang] ?? master.specialties?.ru ?? [];
  const rating = parseFloat(master.averageRating || "0");

  const serviceModeLabel =
    master.serviceMode === "mobile"
      ? t("master.serviceMode.mobile") || "Выезд"
      : master.serviceMode === "both"
        ? t("master.serviceMode.both") || "Выезд / У мастера"
        : t("master.serviceMode.atMaster") || "У мастера";

  return (
    <Link href={`/master/${master.slug}`}>
      <Card className="group overflow-hidden cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-500 ease-out">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted flex items-center justify-center">
          {master.photo ? (
            <img
              src={master.photo}
              alt={master.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <User className="h-16 w-16 text-muted-foreground opacity-30 group-hover:opacity-50 transition-opacity" />
          )}
          {rating > 0 && (
            <div className="absolute bottom-3 left-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm shadow-sm py-1 font-semibold text-primary">
                <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                {rating.toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-serif text-lg text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
            {master.name}
          </h3>
          {master.city && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
              <span className="italic">{master.city}</span>
            </div>
          )}
          {specialties.length > 0 && (
            <p className="text-muted-foreground text-sm line-clamp-1 mb-3 font-light">
              {specialties.slice(0, 3).join(", ")}
            </p>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <Badge variant="outline" className="text-xs font-normal">
              {serviceModeLabel}
            </Badge>
            <span className="text-primary flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {t("marketplace.salon.viewDetails")}
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function HomeMasters() {
  const { t } = useTranslation();

  const { data: masters = [], isLoading } = useQuery<PublicMaster[]>({
    queryKey: ["/api/masters", "home"],
    queryFn: () => fetch("/api/masters?limit=4").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Don't render the section if no solo masters exist
  if (!isLoading && masters.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-3 mb-12">
            <div className="h-10 bg-muted rounded w-72 animate-pulse" />
            <div className="h-5 bg-muted rounded w-52 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/50">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-6 flex-wrap mb-12">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3 font-light">
              {t("home.masters.title") || "Мастера-фрилансеры"}
            </h2>
            <p className="text-muted-foreground text-lg font-light">
              {t("home.masters.subtitle") || "Профессионалы, которые работают на выезд или у себя"}
            </p>
          </div>
          <Link href="/search?tab=masters">
            <Button
              variant="outline"
              className="rounded-full px-6 h-10 border-border/60 hover:border-primary/50 gap-2 animate-in fade-in slide-in-from-right duration-700"
            >
              {t("home.masters.viewAll") || "Все мастера"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          {masters.map((master) => (
            <MasterPreviewCard key={master.id} master={master} />
          ))}
        </div>
      </div>
    </section>
  );
}
