import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Camera, 
  Clock, 
  Users, 
  Scissors, 
  Calendar,
  Plus,
  Trash2,
  Star,
  Save
} from "lucide-react";
import type { Salon, Service, Master, WorkingHours, Booking } from "@shared/schema";

function getLocalizedText(obj: { en: string; ru: string; uz: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

const DAYS_OF_WEEK = [
  { value: 0, labelKey: "sunday" },
  { value: 1, labelKey: "monday" },
  { value: 2, labelKey: "tuesday" },
  { value: 3, labelKey: "wednesday" },
  { value: 4, labelKey: "thursday" },
  { value: 5, labelKey: "friday" },
  { value: 6, labelKey: "saturday" },
];

const SERVICE_CATEGORIES = [
  "haircut",
  "coloring",
  "styling",
  "manicure",
  "pedicure",
  "facial",
  "massage",
  "makeup",
  "waxing",
  "other"
];

export default function OwnerSalonPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const salonId = params.id;

  const [activeTab, setActiveTab] = useState("info");
  
  const [newService, setNewService] = useState({
    nameEn: "",
    nameRu: "",
    nameUz: "",
    category: "haircut",
    priceMin: "",
    priceMax: "",
    duration: "60",
  });

  const [newMaster, setNewMaster] = useState({
    name: "",
    specialties: "",
    experience: "",
  });

  const [workingHours, setWorkingHours] = useState<{
    [key: number]: { open: string; close: string; closed: boolean }
  }>({
    0: { open: "09:00", close: "18:00", closed: true },
    1: { open: "09:00", close: "20:00", closed: false },
    2: { open: "09:00", close: "20:00", closed: false },
    3: { open: "09:00", close: "20:00", closed: false },
    4: { open: "09:00", close: "20:00", closed: false },
    5: { open: "09:00", close: "20:00", closed: false },
    6: { open: "10:00", close: "18:00", closed: false },
  });

  const { data: salon, isLoading: salonLoading } = useQuery<Salon>({
    queryKey: ["/api/owner/salons", salonId],
    enabled: !!user && !!salonId,
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/owner/salons", salonId, "services"],
    enabled: !!user && !!salonId,
  });

  const { data: masters, isLoading: mastersLoading } = useQuery<Master[]>({
    queryKey: ["/api/owner/salons", salonId, "masters"],
    enabled: !!user && !!salonId,
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/owner/salons", salonId, "bookings"],
    enabled: !!user && !!salonId,
  });

  const { data: savedHours } = useQuery<WorkingHours[]>({
    queryKey: ["/api/owner/salons", salonId, "hours"],
    enabled: !!user && !!salonId,
  });

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      const hoursMap: { [key: number]: { open: string; close: string; closed: boolean } } = {};
      savedHours.forEach((h) => {
        hoursMap[h.dayOfWeek] = {
          open: h.openTime,
          close: h.closeTime,
          closed: h.isClosed,
        };
      });
      setWorkingHours((prev) => ({ ...prev, ...hoursMap }));
    }
  }, [savedHours]);

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/services`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "services"] });
      toast({ title: t("marketplace.owner.serviceAdded") });
      setNewService({
        nameEn: "",
        nameRu: "",
        nameUz: "",
        category: "haircut",
        priceMin: "",
        priceMax: "",
        duration: "60",
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t("marketplace.owner.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return apiRequest("DELETE", `/api/owner/salons/${salonId}/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "services"] });
      toast({ title: t("marketplace.owner.serviceDeleted") });
    },
  });

  const createMasterMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/masters`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "masters"] });
      toast({ title: t("marketplace.owner.masterAdded") });
      setNewMaster({ name: "", specialties: "", experience: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: t("marketplace.owner.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMasterMutation = useMutation({
    mutationFn: async (masterId: string) => {
      return apiRequest("DELETE", `/api/owner/salons/${salonId}/masters/${masterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "masters"] });
      toast({ title: t("marketplace.owner.masterDeleted") });
    },
  });

  const saveHoursMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/hours`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "hours"] });
      toast({ title: t("marketplace.owner.hoursSaved") });
    },
    onError: (error: any) => {
      toast({ 
        title: t("marketplace.owner.error"), 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    createServiceMutation.mutate({
      name: { 
        en: newService.nameEn, 
        ru: newService.nameRu || newService.nameEn, 
        uz: newService.nameUz || newService.nameEn 
      },
      category: newService.category,
      priceMin: parseInt(newService.priceMin),
      priceMax: newService.priceMax ? parseInt(newService.priceMax) : null,
      duration: parseInt(newService.duration),
    });
  };

  const handleAddMaster = (e: React.FormEvent) => {
    e.preventDefault();
    createMasterMutation.mutate({
      name: newMaster.name,
      specialties: { 
        en: newMaster.specialties.split(",").map(s => s.trim()),
        ru: newMaster.specialties.split(",").map(s => s.trim()),
        uz: newMaster.specialties.split(",").map(s => s.trim()),
      },
      experience: parseInt(newMaster.experience) || 0,
    });
  };

  const handleSaveHours = () => {
    const hoursData = Object.entries(workingHours).map(([day, hours]) => ({
      dayOfWeek: parseInt(day),
      openTime: hours.open,
      closeTime: hours.close,
      isClosed: hours.closed,
    }));
    saveHoursMutation.mutate({ hours: hoursData });
  };

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

  const salonName = getLocalizedText(salon.name as any, currentLang);

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
          <TabsList className="grid w-full grid-cols-5 mb-8">
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
            <TabsTrigger value="bookings" data-testid="tab-salon-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              {t("marketplace.owner.bookings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="p-6">
              <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.salonInfo")}</h3>
              <div className="space-y-4">
                <div>
                  <Label>{t("marketplace.owner.photos")}</Label>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    {salon.photos && salon.photos.length > 0 ? (
                      salon.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-square bg-muted rounded-md overflow-hidden">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-4 text-center py-8 border-2 border-dashed border-border rounded-md">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">{t("marketplace.owner.noPhotos")}</p>
                        <Button variant="outline" className="mt-2" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("marketplace.owner.addPhoto")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("marketplace.owner.address")}</Label>
                    <p className="text-foreground mt-1">{salon.address}</p>
                  </div>
                  <div>
                    <Label>{t("marketplace.owner.phone")}</Label>
                    <p className="text-foreground mt-1">{salon.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    <span className="font-medium">{Number(salon.averageRating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {salon.reviewCount || 0} {t("marketplace.owner.reviews")}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.addService")}</h3>
                <form onSubmit={handleAddService} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>{t("marketplace.owner.serviceNameEn")}</Label>
                      <Input
                        value={newService.nameEn}
                        onChange={(e) => setNewService({ ...newService, nameEn: e.target.value })}
                        placeholder="Haircut"
                        required
                        data-testid="input-service-name-en"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.serviceNameRu")}</Label>
                      <Input
                        value={newService.nameRu}
                        onChange={(e) => setNewService({ ...newService, nameRu: e.target.value })}
                        placeholder="Стрижка"
                        data-testid="input-service-name-ru"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.serviceNameUz")}</Label>
                      <Input
                        value={newService.nameUz}
                        onChange={(e) => setNewService({ ...newService, nameUz: e.target.value })}
                        placeholder="Soch turmagi"
                        data-testid="input-service-name-uz"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>{t("marketplace.owner.category")}</Label>
                      <select
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        data-testid="select-service-category"
                      >
                        {SERVICE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{t(`marketplace.categories.${cat}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.priceMin")} (UZS)</Label>
                      <Input
                        type="number"
                        value={newService.priceMin}
                        onChange={(e) => setNewService({ ...newService, priceMin: e.target.value })}
                        placeholder="50000"
                        required
                        data-testid="input-service-price-min"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.priceMax")} (UZS)</Label>
                      <Input
                        type="number"
                        value={newService.priceMax}
                        onChange={(e) => setNewService({ ...newService, priceMax: e.target.value })}
                        placeholder="100000"
                        data-testid="input-service-price-max"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.duration")} ({t("marketplace.owner.minutes")})</Label>
                      <Input
                        type="number"
                        value={newService.duration}
                        onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                        placeholder="60"
                        required
                        data-testid="input-service-duration"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={createServiceMutation.isPending} data-testid="button-add-service">
                    <Plus className="h-4 w-4 mr-2" />
                    {createServiceMutation.isPending ? t("marketplace.owner.adding") : t("marketplace.owner.addService")}
                  </Button>
                </form>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.servicesList")}</h3>
                {servicesLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : services && services.length > 0 ? (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div 
                        key={service.id} 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-md"
                        data-testid={`service-item-${service.id}`}
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {getLocalizedText(service.name as any, currentLang)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t(`marketplace.categories.${service.category}`)} • {service.duration} {t("marketplace.owner.min")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-foreground">
                            {service.priceMin.toLocaleString()} {service.priceMax ? `- ${service.priceMax.toLocaleString()}` : ""} UZS
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteServiceMutation.mutate(service.id)}
                            data-testid={`button-delete-service-${service.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">{t("marketplace.owner.noServices")}</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.addMaster")}</h3>
                <form onSubmit={handleAddMaster} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>{t("marketplace.owner.masterName")}</Label>
                      <Input
                        value={newMaster.name}
                        onChange={(e) => setNewMaster({ ...newMaster, name: e.target.value })}
                        placeholder="John Smith"
                        required
                        data-testid="input-master-name"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.specialties")}</Label>
                      <Input
                        value={newMaster.specialties}
                        onChange={(e) => setNewMaster({ ...newMaster, specialties: e.target.value })}
                        placeholder="Haircut, Coloring, Styling"
                        data-testid="input-master-specialties"
                      />
                    </div>
                    <div>
                      <Label>{t("marketplace.owner.experience")} ({t("marketplace.owner.years")})</Label>
                      <Input
                        type="number"
                        value={newMaster.experience}
                        onChange={(e) => setNewMaster({ ...newMaster, experience: e.target.value })}
                        placeholder="5"
                        data-testid="input-master-experience"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={createMasterMutation.isPending} data-testid="button-add-master">
                    <Plus className="h-4 w-4 mr-2" />
                    {createMasterMutation.isPending ? t("marketplace.owner.adding") : t("marketplace.owner.addMaster")}
                  </Button>
                </form>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.staffList")}</h3>
                {mastersLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-muted rounded" />
                    ))}
                  </div>
                ) : masters && masters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {masters.map((master) => (
                      <div 
                        key={master.id} 
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-md"
                        data-testid={`master-item-${master.id}`}
                      >
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{master.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {master.experience} {t("marketplace.owner.yearsExp")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMasterMutation.mutate(master.id)}
                          data-testid={`button-delete-master-${master.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">{t("marketplace.owner.noStaff")}</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hours">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-medium text-foreground">{t("marketplace.owner.workingHours")}</h3>
                <Button onClick={handleSaveHours} disabled={saveHoursMutation.isPending} data-testid="button-save-hours">
                  <Save className="h-4 w-4 mr-2" />
                  {saveHoursMutation.isPending ? t("marketplace.owner.saving") : t("marketplace.owner.saveHours")}
                </Button>
              </div>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div 
                    key={day.value} 
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-md"
                    data-testid={`hours-day-${day.value}`}
                  >
                    <div className="w-32">
                      <span className="font-medium text-foreground">
                        {t(`marketplace.days.${day.labelKey}`)}
                      </span>
                    </div>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={workingHours[day.value]?.closed}
                        onChange={(e) => setWorkingHours({
                          ...workingHours,
                          [day.value]: { ...workingHours[day.value], closed: e.target.checked }
                        })}
                        className="h-4 w-4"
                        data-testid={`checkbox-closed-${day.value}`}
                      />
                      <span className="text-sm text-muted-foreground">{t("marketplace.owner.closed")}</span>
                    </label>

                    {!workingHours[day.value]?.closed && (
                      <>
                        <Input
                          type="time"
                          value={workingHours[day.value]?.open || "09:00"}
                          onChange={(e) => setWorkingHours({
                            ...workingHours,
                            [day.value]: { ...workingHours[day.value], open: e.target.value }
                          })}
                          className="w-32"
                          data-testid={`input-open-${day.value}`}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={workingHours[day.value]?.close || "20:00"}
                          onChange={(e) => setWorkingHours({
                            ...workingHours,
                            [day.value]: { ...workingHours[day.value], close: e.target.value }
                          })}
                          className="w-32"
                          data-testid={`input-close-${day.value}`}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-6">
              <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.upcomingBookings")}</h3>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-md"
                      data-testid={`booking-item-${booking.id}`}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {new Date(booking.bookingDate).toLocaleDateString()} • {booking.startTime}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.status}
                        </p>
                      </div>
                      <span className="font-medium text-foreground">
                        {booking.priceSnapshot?.toLocaleString()} UZS
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t("marketplace.owner.noBookings")}</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
