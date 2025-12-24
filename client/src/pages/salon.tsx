import { useState } from "react";
import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/i18n";
import type { Salon, Service, Master, Review, WorkingHours } from "@shared/schema";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Heart,
  Share2,
  CheckCircle,
  Calendar,
  ChevronRight,
  Scissors,
} from "lucide-react";

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function SalonHeader({ salon }: { salon: Salon }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(salon.name as any, currentLang);
  const city = getLocalizedText(salon.city as any, currentLang);

  return (
    <div className="relative">
      <div className="h-64 md:h-80 overflow-hidden">
        {salon.photos && (salon.photos as string[])[0] ? (
          <img
            src={(salon.photos as string[])[0]}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Scissors className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="icon" className="bg-white/80 backdrop-blur-sm hover:bg-white" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="bg-white/80 backdrop-blur-sm hover:bg-white" data-testid="button-share">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="bg-white/80 backdrop-blur-sm hover:bg-white" data-testid="button-favorite">
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-white/90 text-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t("marketplace.salon.verified")}
            </Badge>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-light mb-2">
            {name || "Unnamed Salon"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/90">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{city}</span>
            </div>
            {salon.averageRating && Number(salon.averageRating) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{Number(salon.averageRating).toFixed(1)}</span>
                <span className="text-white/70">({salon.reviewCount || 0} {t("marketplace.salon.reviews")})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(service.name as any, currentLang);
  const description = getLocalizedText(service.description as any, currentLang);

  return (
    <Card className="p-4" data-testid={`card-service-${service.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-foreground mb-1">{name}</h3>
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
          <Button size="sm" className="mt-2" data-testid={`button-book-service-${service.id}`}>
            {t("marketplace.salon.bookNow")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MasterCard({ master }: { master: Master }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const specialties = master.specialties as { en?: string[]; ru?: string[]; uz?: string[] } | null;
  const specs = specialties ? (specialties[currentLang as keyof typeof specialties] || specialties.en || []) : [];
  const bio = getLocalizedText(master.bio as any, currentLang);

  return (
    <Card className="p-4" data-testid={`card-master-${master.id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {master.photo && <AvatarImage src={master.photo} alt={master.name} />}
          <AvatarFallback>{master.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{master.name}</h3>
          {specs.length > 0 && (
            <p className="text-primary text-sm mb-1">{specs.join(", ")}</p>
          )}
          {master.experience && (
            <p className="text-muted-foreground text-sm mb-2">
              {master.experience} {t("marketplace.salon.experience")}
            </p>
          )}
          {bio && (
            <p className="text-muted-foreground text-sm line-clamp-2">{bio}</p>
          )}
          {master.averageRating && Number(master.averageRating) > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>{Number(master.averageRating).toFixed(1)}</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" data-testid={`button-book-master-${master.id}`}>
          {t("marketplace.salon.bookNow")}
        </Button>
      </div>
    </Card>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="p-4" data-testid={`card-review-${review.id}`}>
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-sm">
              {review.createdAt && new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          {review.comment && (
            <p className="text-foreground">{review.comment}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function WorkingHoursDisplay({ hours }: { hours: WorkingHours[] }) {
  const { t } = useTranslation();

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const sortedHours = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="space-y-2">
      {sortedHours.map((hour) => (
        <div key={hour.id} className="flex items-center justify-between text-sm">
          <span className="text-foreground">{t(`marketplace.days.${dayNames[hour.dayOfWeek]}`)}</span>
          <span className={hour.isClosed ? "text-muted-foreground" : "text-foreground"}>
            {hour.isClosed ? t("marketplace.salon.closed") : `${hour.openTime} - ${hour.closeTime}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SalonPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const { data: salon, isLoading: salonLoading } = useQuery<Salon>({
    queryKey: ["/api/salons", id],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/salons", id, "services"],
    enabled: !!id,
  });

  const { data: masters } = useQuery<Master[]>({
    queryKey: ["/api/salons", id, "masters"],
    enabled: !!id,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/salons", id, "reviews"],
    enabled: !!id,
  });

  const { data: hours } = useQuery<WorkingHours[]>({
    queryKey: ["/api/salons", id, "hours"],
    enabled: !!id,
  });

  if (salonLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-64 md:h-80 bg-muted animate-pulse" />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-xl text-foreground mb-2">Salon not found</h2>
          <Link href="/">
            <Button className="mt-4" data-testid="button-go-home">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const description = getLocalizedText(salon.description as any, currentLang);
  const address = getLocalizedText(salon.address as any, currentLang);

  return (
    <div className="min-h-screen bg-background">
      <SalonHeader salon={salon} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="services" data-testid="tab-services">
                  {t("marketplace.salon.services")}
                </TabsTrigger>
                <TabsTrigger value="team" data-testid="tab-team">
                  {t("marketplace.salon.team")}
                </TabsTrigger>
                <TabsTrigger value="reviews" data-testid="tab-reviews">
                  {t("marketplace.salon.reviews")} ({reviews?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="about" data-testid="tab-about">
                  {t("marketplace.salon.about")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="space-y-4">
                {services && services.length > 0 ? (
                  services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No services available</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="team" className="space-y-4">
                {masters && masters.length > 0 ? (
                  masters.map((master) => (
                    <MasterCard key={master.id} master={master} />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No team members listed</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                {reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No reviews yet</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="about">
                <Card className="p-6">
                  {description && (
                    <div className="mb-6">
                      <h3 className="font-medium text-foreground mb-2">{t("marketplace.salon.about")}</h3>
                      <p className="text-muted-foreground">{description}</p>
                    </div>
                  )}
                  {salon.photos && (salon.photos as string[]).length > 1 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-foreground mb-3">{t("marketplace.salon.gallery")}</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(salon.photos as string[]).slice(0, 6).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Gallery ${index + 1}`}
                            className="aspect-square object-cover rounded-md"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <Button className="w-full mb-4" size="lg" data-testid="button-book-main">
                <Calendar className="h-5 w-5 mr-2" />
                {t("marketplace.salon.bookNow")}
              </Button>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">{t("marketplace.salon.location")}</h4>
                  <div className="flex items-start gap-2 text-muted-foreground text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{address}</span>
                  </div>
                </div>

                {salon.phone && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">{t("marketplace.salon.contact")}</h4>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${salon.phone}`} className="hover:text-foreground">{salon.phone}</a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {hours && hours.length > 0 && (
              <Card className="p-6">
                <h4 className="text-sm font-medium text-foreground mb-3">{t("marketplace.salon.hours")}</h4>
                <WorkingHoursDisplay hours={hours} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
