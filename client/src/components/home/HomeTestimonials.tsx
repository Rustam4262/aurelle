import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

interface Testimonial {
  id: number;
  nameKey: string;
  roleKey: string;
  avatar: string;
  rating: number;
  textKey: string;
  serviceKey: string;
}

const getTestimonials = (): Testimonial[] => [
  {
    id: 1,
    nameKey: "marketplace.home.testimonials.t1.name",
    roleKey: "marketplace.home.testimonials.t1.role",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    rating: 5,
    textKey: "marketplace.home.testimonials.t1.text",
    serviceKey: "marketplace.home.testimonials.t1.service",
  },
  {
    id: 2,
    nameKey: "marketplace.home.testimonials.t2.name",
    roleKey: "marketplace.home.testimonials.t2.role",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dmitry",
    rating: 5,
    textKey: "marketplace.home.testimonials.t2.text",
    serviceKey: "marketplace.home.testimonials.t2.service",
  },
  {
    id: 3,
    nameKey: "marketplace.home.testimonials.t3.name",
    roleKey: "marketplace.home.testimonials.t3.role",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    rating: 5,
    textKey: "marketplace.home.testimonials.t3.text",
    serviceKey: "marketplace.home.testimonials.t3.service",
  },
  {
    id: 4,
    nameKey: "marketplace.home.testimonials.t4.name",
    roleKey: "marketplace.home.testimonials.t4.role",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kate",
    rating: 5,
    textKey: "marketplace.home.testimonials.t4.text",
    serviceKey: "marketplace.home.testimonials.t4.service",
  },
  {
    id: 5,
    nameKey: "marketplace.home.testimonials.t5.name",
    roleKey: "marketplace.home.testimonials.t5.role",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    rating: 5,
    textKey: "marketplace.home.testimonials.t5.text",
    serviceKey: "marketplace.home.testimonials.t5.service",
  },
];

export function HomeTestimonials() {
  const { t } = useTranslation();
  const testimonials = getTestimonials();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate testimonials
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isPaused, testimonials.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Quote className="h-4 w-4" />
            {t("marketplace.home.testimonials.badge")}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-light">
            {t("marketplace.home.testimonials.title")}
          </h2>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto">
            {t("marketplace.home.testimonials.subtitle")}
          </p>
        </div>

        {/* Testimonial Card */}
        <div
          className="max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Card className="p-8 md:p-12 relative overflow-hidden border-border/50 shadow-2xl shadow-primary/5 animate-in zoom-in duration-500">
            {/* Quote Icon */}
            <div className="absolute top-6 right-6 opacity-5">
              <Quote className="h-32 w-32 text-primary" />
            </div>

            <div className="relative z-10">
              {/* Rating Stars */}
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: currentTestimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-lg md:text-xl text-foreground mb-8 leading-relaxed font-light italic">
                &ldquo;{t(currentTestimonial.textKey)}&rdquo;
              </blockquote>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-pink-500 rounded-full blur-md opacity-50"></div>
                  <img
                    src={currentTestimonial.avatar}
                    alt={t(currentTestimonial.nameKey)}
                    className="relative h-16 w-16 rounded-full bg-muted border-2 border-background"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-foreground">
                    {t(currentTestimonial.nameKey)}
                  </h4>
                  <p className="text-sm text-muted-foreground">{t(currentTestimonial.roleKey)}</p>
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {t(currentTestimonial.serviceKey)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Navigation */}
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
              {testimonials.map((_, index) => (
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

          {/* Counter */}
          <p className="text-center text-sm text-muted-foreground mt-4 font-medium">
            {currentIndex + 1} / {testimonials.length}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">10,000+</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.happyClients")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">500+</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.beautySalons")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">4.9</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.avgRating")}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">50K+</div>
            <div className="text-sm text-muted-foreground">
              {t("marketplace.home.testimonials.stats.bookingsCompleted")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
