import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useSalonData } from "@/hooks/use-salon-data";
import { useSalonBooking } from "@/hooks/use-salon-booking";
import { getLocalizedText } from "@/lib/i18n";
import type { Service, Master } from "@shared/schema";
import { MapPin, Phone, Calendar, Scissors, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sub-components
import { SalonHeader } from "@/components/salon/SalonHeader";
import { SalonServices } from "@/components/salon/SalonServices";
import { SalonTeam } from "@/components/salon/SalonTeam";
import { SalonReviews } from "@/components/salon/SalonReviews";
import { SalonAbout, WorkingHoursDisplay } from "@/components/salon/SalonAbout";
import { SalonBookingDialog } from "@/components/salon/SalonBookingDialog";

export default function SalonPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const {
    salonQuery,
    servicesQuery,
    mastersQuery,
    reviewsQuery,
    hoursQuery,
    isLoading: dataLoading,
  } = useSalonData(id);

  const {
    bookingDialogOpen,
    setBookingDialogOpen,
    selectedService,
    selectedMaster,
    bookingDate,
    setBookingDate,
    bookingTime,
    setBookingTime,
    bookingNotes,
    setBookingNotes,
    createBookingMutation,
    handleBookService,
    handleSubmitBooking,
  } = useSalonBooking(id);

  const onBook = (service: Service, master?: Master) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    handleBookService(service, master);
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const salon = salonQuery.data;

  if (!salon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md mx-auto">
          <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-foreground mb-4">
            {t("marketplace.salon.notFound") || "Salon not found"}
          </h2>
          <Button onClick={() => navigate("/")} className="w-full">
            {t("marketplace.salon.backHome") || "Go Home"}
          </Button>
        </Card>
      </div>
    );
  }

  const address = getLocalizedText(
    salon.address as unknown as { en: string; ru: string; uz: string },
    currentLang,
  );

  return (
    <div className="min-h-screen bg-background">
      <SalonHeader salon={salon} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start mb-6 bg-transparent border-b rounded-none h-auto p-0">
                <TabsTrigger
                  value="services"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  data-testid="tab-services"
                >
                  {t("marketplace.salon.services")}
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  data-testid="tab-team"
                >
                  {t("marketplace.salon.team")}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  data-testid="tab-reviews"
                >
                  {t("marketplace.salon.reviews")} ({reviewsQuery.data?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  data-testid="tab-about"
                >
                  {t("marketplace.salon.about")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services">
                <SalonServices services={servicesQuery.data} onBook={onBook} />
              </TabsContent>

              <TabsContent value="team">
                <SalonTeam
                  masters={mastersQuery.data}
                  services={servicesQuery.data}
                  onBookService={(s, m) => onBook(s, m)}
                />
              </TabsContent>

              <TabsContent value="reviews">
                <SalonReviews reviews={reviewsQuery.data} />
              </TabsContent>

              <TabsContent value="about">
                <SalonAbout salon={salon} hours={hoursQuery.data} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="p-6 sticky top-24">
              <Button
                className="w-full mb-6 font-medium tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
                size="lg"
                onClick={() => {
                  if (servicesQuery.data && servicesQuery.data.length > 0) {
                    onBook(servicesQuery.data[0]);
                  } else {
                    toast({
                      title: t("marketplace.salon.noServices"),
                      description: t("marketplace.salon.noServicesAvailable"),
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-book-main"
              >
                <Calendar className="h-5 w-5 mr-2" />
                {t("marketplace.salon.bookNow")}
              </Button>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {t("marketplace.salon.location")}
                  </h4>
                  <div className="flex items-start gap-2 text-foreground text-sm font-medium">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{address}</span>
                  </div>
                </div>

                {salon.phone && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("marketplace.salon.contact")}
                    </h4>
                    <div className="flex items-center gap-2 text-foreground text-sm font-medium">
                      <Phone className="h-4 w-4 text-primary" />
                      <a
                        href={`tel:${salon.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {salon.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {hoursQuery.data && hoursQuery.data.length > 0 && (
              <Card className="p-6 hidden lg:block">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  {t("marketplace.salon.hours")}
                </h4>
                <WorkingHoursDisplay hours={hoursQuery.data} />
              </Card>
            )}
          </div>
        </div>

        <SalonBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          salonId={id}
          selectedService={selectedService}
          selectedMaster={selectedMaster}
          bookingDate={bookingDate}
          setBookingDate={setBookingDate}
          bookingTime={bookingTime}
          setBookingTime={setBookingTime}
          bookingNotes={bookingNotes}
          setBookingNotes={setBookingNotes}
          onSubmit={handleSubmitBooking}
          isSubmitting={createBookingMutation.isPending}
        />
      </div>
    </div>
  );
}
