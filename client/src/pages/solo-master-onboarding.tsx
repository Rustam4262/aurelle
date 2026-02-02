import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Clock,
  User,
  Globe,
  Briefcase,
  Loader2,
  Home as HomeIcon,
  Car,
  MapPinned,
} from "lucide-react";
import { LocationPicker } from "@/components/location-picker";

type OnboardingStep = "basic" | "location" | "service-mode" | "slug" | "schedule";

interface MasterData {
  id: string;
  name: string;
  phone: string | null;
  bio: { en: string; ru: string; uz: string } | null;
  photo: string | null;
  address: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  serviceMode: string | null;
  workRadius: number | null;
  mobileExtraCharge: number | null;
  slug: string | null;
  status: string | null;
}

interface WorkingHour {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_WORKING_HOURS: WorkingHour[] = [
  { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" }, // Sunday
  { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 6, isOpen: false, openTime: "10:00", closeTime: "16:00" }, // Saturday
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SoloMasterOnboarding() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "en" | "ru" | "uz";
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<OnboardingStep>("basic");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    photo: "",
    address: "",
    city: "",
    latitude: 0,
    longitude: 0,
    serviceMode: "at_master" as "at_master" | "mobile" | "both",
    workRadius: 10,
    mobileExtraCharge: 0,
    slug: "",
  });
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(DEFAULT_WORKING_HOURS);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Fetch existing master data
  const { data: masterData, isLoading: masterLoading } = useQuery<MasterData>({
    queryKey: ["/api/solo-master/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/solo-master/me");
      if (!res.ok) throw new Error("Failed to fetch master data");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Populate form with existing data
  useEffect(() => {
    if (masterData) {
      setFormData({
        name: masterData.name || "",
        phone: masterData.phone || "",
        bio: masterData.bio?.[currentLang] || "",
        photo: masterData.photo || "",
        address: masterData.address || "",
        city: masterData.city || "",
        latitude: masterData.latitude ? parseFloat(masterData.latitude) : 0,
        longitude: masterData.longitude ? parseFloat(masterData.longitude) : 0,
        serviceMode: (masterData.serviceMode as "at_master" | "mobile" | "both") || "at_master",
        workRadius: masterData.workRadius || 10,
        mobileExtraCharge: masterData.mobileExtraCharge || 0,
        slug: masterData.slug || "",
      });
    }
  }, [masterData, currentLang]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      const res = await apiRequest("PUT", "/api/solo-master/profile", data);
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solo-master/me"] });
      toast({
        title: t("soloMaster.onboarding.saved", "Progress saved"),
        description: t("soloMaster.onboarding.savedDesc", "Your changes have been saved"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("soloMaster.onboarding.saveFailed", "Failed to save changes"),
        variant: "destructive",
      });
    },
  });

  // Save working hours mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (hours: WorkingHour[]) => {
      const res = await apiRequest("PUT", "/api/solo-master/schedule", { hours });
      if (!res.ok) throw new Error("Failed to save schedule");
      return res.json();
    },
  });

  // Complete onboarding mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/solo-master/complete-onboarding");
      if (!res.ok) throw new Error("Failed to complete onboarding");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("soloMaster.onboarding.complete", "Setup Complete!"),
        description: t("soloMaster.onboarding.completeDesc", "Your profile is ready. Add services to start accepting bookings."),
      });
      navigate("/solo-master");
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("soloMaster.onboarding.completeFailed", "Failed to complete setup"),
        variant: "destructive",
      });
    },
  });

  // Check slug availability
  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    try {
      const res = await apiRequest("GET", `/api/solo-master/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugAvailable(data.available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const steps: OnboardingStep[] = ["basic", "location", "service-mode", "slug", "schedule"];
  const currentStepIndex = steps.indexOf(step);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      // Save current step data
      if (step === "basic") {
        saveMutation.mutate({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
        });
      } else if (step === "location") {
        saveMutation.mutate({
          address: formData.address,
          city: formData.city,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
      } else if (step === "service-mode") {
        saveMutation.mutate({
          serviceMode: formData.serviceMode,
          workRadius: formData.workRadius,
          mobileExtraCharge: formData.mobileExtraCharge,
        });
      } else if (step === "slug") {
        saveMutation.mutate({
          slug: formData.slug,
        });
      }
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    // Save schedule first
    await saveScheduleMutation.mutateAsync(workingHours);
    // Complete onboarding
    await completeMutation.mutateAsync();
  };

  if (authLoading || masterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${
            i === currentStepIndex
              ? "bg-primary"
              : i < currentStepIndex
                ? "bg-primary/50"
                : "bg-muted"
          }`}
        />
      ))}
    </div>
  );

  const renderBasicStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <User className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{t("soloMaster.onboarding.step1Title", "Basic Information")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("soloMaster.onboarding.step1Desc", "Tell us about yourself")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("soloMaster.onboarding.name", "Your Name")}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("soloMaster.onboarding.namePlaceholder", "How clients will see you")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("soloMaster.onboarding.phone", "Phone Number")}</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+998 XX XXX XX XX"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t("soloMaster.onboarding.bio", "About You")}</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder={t("soloMaster.onboarding.bioPlaceholder", "Tell clients about your experience and specialties...")}
            rows={4}
          />
        </div>
      </div>
    </div>
  );

  const renderLocationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{t("soloMaster.onboarding.step2Title", "Your Location")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("soloMaster.onboarding.step2Desc", "Where do you provide services?")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="city">{t("soloMaster.onboarding.city", "City")}</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder={t("soloMaster.onboarding.cityPlaceholder", "e.g., Tashkent")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t("soloMaster.onboarding.address", "Address")}</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder={t("soloMaster.onboarding.addressPlaceholder", "Your work address (shown to clients after booking)")}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("soloMaster.onboarding.mapLocation", "Pin your location on the map")}</Label>
          <LocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            address={formData.address}
            onLocationChange={(location) =>
              setFormData({
                ...formData,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address || formData.address,
              })
            }
          />
        </div>
      </div>
    </div>
  );

  const renderServiceModeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{t("soloMaster.onboarding.step3Title", "Service Mode")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("soloMaster.onboarding.step3Desc", "How do you provide services?")}
        </p>
      </div>

      <RadioGroup
        value={formData.serviceMode}
        onValueChange={(value) => setFormData({ ...formData, serviceMode: value as "at_master" | "mobile" | "both" })}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="at_master" id="at_master" />
          <Label htmlFor="at_master" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-primary" />
              <span className="font-medium">{t("soloMaster.serviceMode.atMaster", "At My Place")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("soloMaster.serviceMode.atMasterDesc", "Clients come to your location")}
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="mobile" id="mobile" />
          <Label htmlFor="mobile" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <span className="font-medium">{t("soloMaster.serviceMode.mobile", "Mobile")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("soloMaster.serviceMode.mobileDesc", "You travel to clients")}
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="both" id="both" />
          <Label htmlFor="both" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-primary" />
              <span className="font-medium">{t("soloMaster.serviceMode.both", "Both")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("soloMaster.serviceMode.bothDesc", "Offer both options to clients")}
            </p>
          </Label>
        </div>
      </RadioGroup>

      {(formData.serviceMode === "mobile" || formData.serviceMode === "both") && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>{t("soloMaster.workRadius", "Work Radius")}: {formData.workRadius} km</Label>
            <Slider
              value={[formData.workRadius]}
              onValueChange={([value]) => setFormData({ ...formData, workRadius: value })}
              min={1}
              max={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {t("soloMaster.workRadiusDesc", "Maximum distance you're willing to travel")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileCharge">
              {t("soloMaster.mobileExtraCharge", "Mobile Service Extra Charge")} (UZS)
            </Label>
            <Input
              id="mobileCharge"
              type="number"
              value={formData.mobileExtraCharge}
              onChange={(e) => setFormData({ ...formData, mobileExtraCharge: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              {t("soloMaster.mobileExtraChargeDesc", "Additional fee for mobile services")}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderSlugStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Globe className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{t("soloMaster.onboarding.step4Title", "Your Public Page")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("soloMaster.onboarding.step4Desc", "Choose your unique URL")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug">{t("soloMaster.publicUrl", "Your Public URL")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">aurelle.uz/master/</span>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                setFormData({ ...formData, slug });
                checkSlug(slug);
              }}
              placeholder="your-name"
              className="flex-1"
            />
          </div>
        </div>

        {formData.slug && (
          <div className="flex items-center gap-2 text-sm">
            {checkingSlug ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : slugAvailable === true ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600">{t("soloMaster.slugAvailable", "URL available")}</span>
              </>
            ) : slugAvailable === false ? (
              <span className="text-destructive">{t("soloMaster.slugTaken", "URL already taken")}</span>
            ) : null}
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-1">{t("soloMaster.preview", "Preview")}</p>
          <p className="text-primary text-lg">aurelle.uz/master/{formData.slug || "your-name"}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("soloMaster.slugInfo", "Clients will use this URL to find and book with you")}
          </p>
        </div>
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{t("soloMaster.onboarding.step5Title", "Working Hours")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("soloMaster.onboarding.step5Desc", "When are you available?")}
        </p>
      </div>

      <div className="space-y-3">
        {workingHours.map((day, index) => (
          <div key={day.dayOfWeek} className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="w-12">
              <span className="font-medium">{DAY_NAMES[day.dayOfWeek]}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={(e) => {
                  const updated = [...workingHours];
                  updated[index] = { ...day, isOpen: e.target.checked };
                  setWorkingHours(updated);
                }}
                className="h-4 w-4"
              />
              <span className="text-sm">{day.isOpen ? t("common.open", "Open") : t("common.closed", "Closed")}</span>
            </label>
            {day.isOpen && (
              <div className="flex items-center gap-2 ml-auto">
                <Input
                  type="time"
                  value={day.openTime}
                  onChange={(e) => {
                    const updated = [...workingHours];
                    updated[index] = { ...day, openTime: e.target.value };
                    setWorkingHours(updated);
                  }}
                  className="w-24"
                />
                <span>-</span>
                <Input
                  type="time"
                  value={day.closeTime}
                  onChange={(e) => {
                    const updated = [...workingHours];
                    updated[index] = { ...day, closeTime: e.target.value };
                    setWorkingHours(updated);
                  }}
                  className="w-24"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container max-w-lg mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {t("soloMaster.onboarding.title", "Set Up Your Profile")}
            </CardTitle>
            <CardDescription>
              {t("soloMaster.onboarding.subtitle", "Complete these steps to start accepting bookings")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepIndicator()}

            {step === "basic" && renderBasicStep()}
            {step === "location" && renderLocationStep()}
            {step === "service-mode" && renderServiceModeStep()}
            {step === "slug" && renderSlugStep()}
            {step === "schedule" && renderScheduleStep()}

            <div className="flex gap-3 mt-8">
              {currentStepIndex > 0 && (
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back", "Back")}
                </Button>
              )}
              {currentStepIndex < steps.length - 1 ? (
                <Button onClick={goNext} className="flex-1" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t("common.continue", "Continue")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="flex-1"
                  disabled={completeMutation.isPending || saveScheduleMutation.isPending}
                >
                  {completeMutation.isPending || saveScheduleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t("soloMaster.onboarding.finish", "Finish Setup")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
