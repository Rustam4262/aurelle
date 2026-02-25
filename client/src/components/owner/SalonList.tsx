import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Star, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalonCreationWizard } from "@/components/salon-creation-wizard";
import type { Salon } from "@shared/schema";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

export function SalonList() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const queryClient = useQueryClient();
  const [showAddSalon, setShowAddSalon] = useState(false);

  const { data: salons, isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ["/api/owner/salons"],
  });

  if (salonsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!salons || salons.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">
          {t("marketplace.owner.noSalons")}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {t("marketplace.owner.registerFirst")}
        </p>
        <Button onClick={() => setShowAddSalon(true)} data-testid="button-add-first-salon">
          <Plus className="h-4 w-4 mr-2" />
          {t("marketplace.owner.addSalon")}
        </Button>
        <SalonCreationWizard
          open={showAddSalon}
          onOpenChange={setShowAddSalon}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/owner/salons"] })}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <h2 className="font-serif text-2xl text-foreground">{t("marketplace.owner.mySalons")}</h2>
        <Button onClick={() => setShowAddSalon(true)} data-testid="button-add-salon">
          <Plus className="h-4 w-4 mr-2" />
          {t("marketplace.owner.addSalon")}
        </Button>
      </div>

      <SalonCreationWizard
        open={showAddSalon}
        onOpenChange={setShowAddSalon}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/owner/salons"] })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {salons.map((salon) => {
          const name = getLocalizedText(salon.name as any, currentLang);
          const city = getLocalizedText(salon.city as any, currentLang);
          const status = (salon as any).status || "draft";

          const getStatusBadge = () => {
            switch (status) {
              case "active":
                return (
                  <Badge variant="default" className="bg-green-500">
                    {t("salonStatus.active")}
                  </Badge>
                );
              case "paused":
                return (
                  <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                    {t("salonStatus.paused")}
                  </Badge>
                );
              default:
                return <Badge variant="outline">{t("salonStatus.draft")}</Badge>;
            }
          };

          return (
            <Card
              key={salon.id}
              className="p-6 hover-elevate"
              data-testid={`card-owner-salon-${salon.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{name}</h3>
                    {getStatusBadge()}
                  </div>
                  <p className="text-muted-foreground text-sm">{city}</p>
                </div>
                {salon.averageRating && Number(salon.averageRating) > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span>{Number(salon.averageRating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 bg-muted rounded-md">
                  <p className="font-medium text-foreground">{salon.reviewCount || 0}</p>
                  <p className="text-muted-foreground text-xs">{t("marketplace.owner.reviews")}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-md">
                  <p className="font-medium text-foreground">-</p>
                  <p className="text-muted-foreground text-xs">{t("marketplace.owner.bookings")}</p>
                </div>
              </div>

              <Link href={`/owner/salon/${salon.id}`}>
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid={`button-manage-salon-${salon.id}`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("marketplace.owner.manageSalon")}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
