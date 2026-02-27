import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Camera, Clock, Users, Scissors, Calendar, UserCog } from "lucide-react";
import type { Salon } from "@shared/schema";
import { OwnerSalonInfo } from "@/components/owner/OwnerSalonInfo";
import { OwnerSalonServices } from "@/components/owner/OwnerSalonServices";
import { OwnerSalonStaff } from "@/components/owner/OwnerSalonStaff";
import { OwnerSalonHours } from "@/components/owner/OwnerSalonHours";
import { OwnerSalonBookings } from "@/components/owner/OwnerSalonBookings";
import { OwnerSalonTeam } from "@/components/owner/OwnerSalonTeam";

function getLocalizedText(
  obj: { en: string; ru: string; uz: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

export default function OwnerSalonPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const salonId = params.id;

  const [activeTab, setActiveTab] = useState("info");

  const { data: salon, isLoading: salonLoading } = useQuery<Salon>({
    queryKey: ["/api/owner/salons", salonId],
    enabled: !!user && !!salonId,
  });

  if (authLoading || salonLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">{t("marketplace.owner.salonNotFound")}</p>
          <Link href="/owner">
            <Button>{t("marketplace.owner.backToSalons")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const salonName = getLocalizedText(
    salon.name as { en: string; ru: string; uz: string },
    currentLang,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/owner">
            <Button variant="ghost" size="icon" data-testid="button-back-salon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-serif text-xl text-foreground">{salonName}</h1>
            <p className="text-sm text-muted-foreground">{t("marketplace.owner.manageSalon")}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="info" data-testid="tab-salon-info">
              <Camera className="h-4 w-4 mr-2" />
              {t("marketplace.owner.info")}
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-salon-services">
              <Scissors className="h-4 w-4 mr-2" />
              {t("marketplace.owner.services")}
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-salon-staff">
              <Users className="h-4 w-4 mr-2" />
              {t("marketplace.owner.staff")}
            </TabsTrigger>
            <TabsTrigger value="hours" data-testid="tab-salon-hours">
              <Clock className="h-4 w-4 mr-2" />
              {t("marketplace.owner.hours")}
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-salon-team">
              <UserCog className="h-4 w-4 mr-2" />
              {t("team.title")}
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-salon-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              {t("marketplace.owner.bookings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <OwnerSalonInfo salon={salon} />
          </TabsContent>

          <TabsContent value="services">
            <OwnerSalonServices salonId={salonId} />
          </TabsContent>

          <TabsContent value="staff">
            <OwnerSalonStaff salonId={salonId} />
          </TabsContent>

          <TabsContent value="hours">
            <OwnerSalonHours salonId={salonId} />
          </TabsContent>

          <TabsContent value="team">
            <OwnerSalonTeam salonId={salonId} />
          </TabsContent>

          <TabsContent value="bookings">
            <OwnerSalonBookings salonId={salonId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
