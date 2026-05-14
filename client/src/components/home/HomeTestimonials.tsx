import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { MarketplaceStats, PublicReview } from "@/hooks/use-marketplace-data";

function formatCount(value?: number) {
  return new Intl.NumberFormat("ru-RU").format(value ?? 0);
}

function formatRating(value?: number) {
  return (value ?? 0).toFixed(1);
}

function getInitials(name?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) return "AU";
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function HomeTestimonials({
  stats,
  reviews,
}: {
  stats?: MarketplaceStats;
  reviews: PublicReview[];
}) {
  const { t, i18n } = useTranslation();
  const visibleReviews = reviews.filter((review) => review.comment?.trim());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || visibleReviews.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleReviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, visibleReviews.length]);

  useEffect(() => {
    if (currentIndex >= visibleReviews.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleReviews.length]);

  const goToPrevious = () => {
    if (visibleReviews.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + visibleReviews.length) % visibleReviews.length);
  };

  const goToNext = () => {
    if (visibleReviews.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % visibleReviews.length);
  };

  const currentReview = visibleReviews[currentIndex];
  const clientName = currentReview?.clientName || t("marketplace.home.testimonials.client", "Клиент AURELLE");
  const salonName = currentReview?.salonName
    ? getLocalizedText(currentReview.salonName, i18n.language)
    : currentReview?.masterName || t("marketplace.home.testimonials.booking", "Запись через AURELLE");
  const title = t("marketplace.home.testimonials.title", "Отзывы клиентов");
  const subtitle = t(
    "marketplace.home.testimonials.subtitle",
    "Показываем только реальные отзывы, оставленные после записей на платформе.",
  );
  const badge = t("marketplace.home.testimonials.badge", "Отзывы");

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Quote className="h-4 w-4" />
            {badge}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-light">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Testimonial Card */}
        <div
          className="max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Card className="p-8 md:p-12 relative overflow-hidden border-border/60 bg-card text-card-foreground shadow-lg animate-in zoom-in duration-500">
            {/* Quote Icon */}
            <div className="absolute top-6 right-6 opacity-5">
              <Quote className="h-32 w-32 text-primary" />
            </div>

            <div className="relative z-10">
              {currentReview ? (
                <>
                  <div className="flex items-center gap-1 mb-6">
                    {Array.from({ length: currentReview.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <blockquote className="text-lg md:text-xl text-foreground mb-8 leading-relaxed font-light italic">
                    &ldquo;{currentReview.comment}&rdquo;
                  </blockquote>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground text-lg font-semibold">
                        {getInitials(clientName)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-foreground">{clientName}</h4>
                      <p className="text-sm text-muted-foreground">{salonName}</p>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        {new Date(currentReview.createdAt || "").toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <Quote className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold text-foreground">
                    {t("marketplace.home.testimonials.emptyTitle", "Реальные отзывы скоро появятся")}
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                    {t(
                      "marketplace.home.testimonials.emptyDescription",
                      "Секция будет заполнена отзывами клиентов после завершённых записей. Мы не показываем вымышленные отзывы.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Navigation */}
          {visibleReviews.length > 1 ? (
            <div className="flex items-center justify-between mt-8">
            {/* Previous Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="rounded-full h-12 w-12 border-2 hover:border-primary/50 hover:bg-primary/5"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots Indicator */}
            <div className="flex items-center gap-2">
              {visibleReviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? "bg-primary w-8 h-2"
                      : "bg-muted-foreground/30 w-2 h-2 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="rounded-full h-12 w-12 border-2 hover:border-primary/50 hover:bg-primary/5"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            </div>
          ) : null}

          {/* Counter */}
          {visibleReviews.length > 0 ? (
            <p className="text-center text-sm text-muted-foreground mt-4 font-medium">
              {currentIndex + 1} / {visibleReviews.length}
            </p>
          ) : null}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">{formatCount(stats?.clientsCount)}</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.happyClients", "Happy clients")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">{formatCount(stats?.salonsCount)}</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.beautySalons", "Beauty salons")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">{formatRating(stats?.averageRating)}</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.avgRating", "Average rating")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">{formatCount(stats?.bookingsCount)}</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.bookingsCompleted", "Bookings completed")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
