import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Store,
  MapPin,
  Image as ImageIcon,
  Clock,
  Users,
  Upload,
  X,
} from "lucide-react";

interface SalonCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface WizardData {
  // Step 1: Basic Info
  nameEn: string;
  nameRu: string;
  nameUz: string;
  phone: string;
  address: string;
  descriptionEn: string;
  descriptionRu: string;
  descriptionUz: string;

  // Step 2: Location
  city: string;
  latitude: string;
  longitude: string;

  // Step 3: Photos
  photos: File[];
  photoUrls: string[]; // For preview
  coverPhotoIndex: number;

  // Step 4: Working Hours
  workingHours: {
    dayOfWeek: number;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }[];

  // Step 5: Initial Setup
  // These will be handled separately after salon creation
  initialService?: any;
  initialMaster?: any;

  // Status
  isDraft: boolean;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_HOURS = "09:00";
const DEFAULT_CLOSE = "20:00";

export function SalonCreationWizard({ open, onOpenChange, onSuccess }: SalonCreationWizardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    nameEn: "",
    nameRu: "",
    nameUz: "",
    phone: "",
    address: "",
    descriptionEn: "",
    descriptionRu: "",
    descriptionUz: "",
    city: "Tashkent",
    latitude: "41.311081",
    longitude: "69.240562",
    photos: [],
    photoUrls: [],
    coverPhotoIndex: 0,
    workingHours: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isOpen: i !== 0, // Sunday closed by default
      openTime: DEFAULT_HOURS,
      closeTime: DEFAULT_CLOSE,
    })),
    isDraft: true,
  });

  const createSalonMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/owner/salons", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create salon");
      }

      return response.json();
    },
    onSuccess: (salon) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons"] });

      toast({
        title: t("wizard.salon.created"),
        description: t("wizard.salon.createdDescription"),
      });

      // Reset wizard
      setStep(1);
      setWizardData({
        nameEn: "",
        nameRu: "",
        nameUz: "",
        phone: "",
        address: "",
        descriptionEn: "",
        descriptionRu: "",
        descriptionUz: "",
        city: "Tashkent",
        latitude: "41.311081",
        longitude: "69.240562",
        photos: [],
        photoUrls: [],
        coverPhotoIndex: 0,
        workingHours: Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          isOpen: i !== 0,
          openTime: DEFAULT_HOURS,
          closeTime: DEFAULT_CLOSE,
        })),
        isDraft: true,
      });

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...wizardData.photos, ...files].slice(0, 6); // Max 6 photos
    const newUrls = newPhotos.map((file) => URL.createObjectURL(file));

    setWizardData({
      ...wizardData,
      photos: newPhotos,
      photoUrls: newUrls,
    });
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = wizardData.photos.filter((_, i) => i !== index);
    const newUrls = wizardData.photoUrls.filter((_, i) => i !== index);

    setWizardData({
      ...wizardData,
      photos: newPhotos,
      photoUrls: newUrls,
      coverPhotoIndex:
        wizardData.coverPhotoIndex >= newPhotos.length ? 0 : wizardData.coverPhotoIndex,
    });
  };

  const handleSubmit = () => {
    const formData = new FormData();

    // Basic info
    formData.append(
      "name",
      JSON.stringify({
        en: wizardData.nameEn,
        ru: wizardData.nameRu || wizardData.nameEn,
        uz: wizardData.nameUz || wizardData.nameEn,
      }),
    );

    formData.append(
      "description",
      JSON.stringify({
        en: wizardData.descriptionEn,
        ru: wizardData.descriptionRu || wizardData.descriptionEn,
        uz: wizardData.descriptionUz || wizardData.descriptionEn,
      }),
    );

    formData.append("phone", wizardData.phone);
    formData.append("address", wizardData.address);
    formData.append("city", wizardData.city);
    formData.append("latitude", wizardData.latitude);
    formData.append("longitude", wizardData.longitude);

    // Photos
    wizardData.photos.forEach((photo, index) => {
      formData.append("photos", photo);
      if (index === wizardData.coverPhotoIndex) {
        formData.append("coverPhotoIndex", index.toString());
      }
    });

    // Working hours - only save open days
    const openHours = wizardData.workingHours.filter((h) => h.isOpen);
    formData.append("workingHours", JSON.stringify(openHours));

    // Status - save as draft if not complete
    const hasServiceAndMaster = false; // Will be added in step 5
    formData.append("status", hasServiceAndMaster ? "active" : "draft");

    createSalonMutation.mutate(formData);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return wizardData.nameEn && wizardData.phone && wizardData.address;
      case 2:
        return wizardData.city && wizardData.latitude && wizardData.longitude;
      case 3:
        return true; // Photos optional
      case 4:
        return wizardData.workingHours.some((h) => h.isOpen);
      case 5:
        return true; // Can create draft
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Store className="h-5 w-5" />
              <h3 className="font-medium">{t("wizard.step1.title")}</h3>
            </div>

            <div>
              <Label htmlFor="nameEn">{t("wizard.step1.nameEn")} *</Label>
              <Input
                id="nameEn"
                value={wizardData.nameEn}
                onChange={(e) => setWizardData({ ...wizardData, nameEn: e.target.value })}
                placeholder="Beauty Salon"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nameRu">{t("wizard.step1.nameRu")}</Label>
                <Input
                  id="nameRu"
                  value={wizardData.nameRu}
                  onChange={(e) => setWizardData({ ...wizardData, nameRu: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>

              <div>
                <Label htmlFor="nameUz">{t("wizard.step1.nameUz")}</Label>
                <Input
                  id="nameUz"
                  value={wizardData.nameUz}
                  onChange={(e) => setWizardData({ ...wizardData, nameUz: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">{t("wizard.step1.phone")} *</Label>
              <Input
                id="phone"
                value={wizardData.phone}
                onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">{t("wizard.step1.address")} *</Label>
              <Input
                id="address"
                value={wizardData.address}
                onChange={(e) => setWizardData({ ...wizardData, address: e.target.value })}
                placeholder="123 Main Street, Tashkent"
                required
              />
            </div>

            <div>
              <Label htmlFor="descriptionEn">{t("wizard.step1.description")}</Label>
              <Textarea
                id="descriptionEn"
                value={wizardData.descriptionEn}
                onChange={(e) => setWizardData({ ...wizardData, descriptionEn: e.target.value })}
                placeholder={t("wizard.step1.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <MapPin className="h-5 w-5" />
              <h3 className="font-medium">{t("wizard.step2.title")}</h3>
            </div>

            <div>
              <Label htmlFor="city">{t("wizard.step2.city")} *</Label>
              <Select
                value={wizardData.city}
                onValueChange={(value) => setWizardData({ ...wizardData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tashkent">Tashkent</SelectItem>
                  <SelectItem value="Samarkand">Samarkand</SelectItem>
                  <SelectItem value="Bukhara">Bukhara</SelectItem>
                  <SelectItem value="Andijan">Andijan</SelectItem>
                  <SelectItem value="Fergana">Fergana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">{t("wizard.step2.latitude")} *</Label>
                <Input
                  id="latitude"
                  value={wizardData.latitude}
                  onChange={(e) => setWizardData({ ...wizardData, latitude: e.target.value })}
                  placeholder="41.311081"
                  required
                />
              </div>

              <div>
                <Label htmlFor="longitude">{t("wizard.step2.longitude")} *</Label>
                <Input
                  id="longitude"
                  value={wizardData.longitude}
                  onChange={(e) => setWizardData({ ...wizardData, longitude: e.target.value })}
                  placeholder="69.240562"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">{t("wizard.step2.mapHint")}</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <ImageIcon className="h-5 w-5" />
              <h3 className="font-medium">{t("wizard.step3.title")}</h3>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{t("wizard.step3.uploadHint")}</p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <Label htmlFor="photo-upload">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("wizard.step3.selectPhotos")}
                </Button>
              </Label>
            </div>

            {wizardData.photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {wizardData.photoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {wizardData.coverPhotoIndex === index && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        {t("wizard.step3.cover")}
                      </div>
                    )}
                    {wizardData.coverPhotoIndex !== index && (
                      <button
                        type="button"
                        onClick={() => setWizardData({ ...wizardData, coverPhotoIndex: index })}
                        className="absolute bottom-2 left-2 bg-background/80 text-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {t("wizard.step3.setCover")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Clock className="h-5 w-5" />
              <h3 className="font-medium">{t("wizard.step4.title")}</h3>
            </div>

            <div className="space-y-3">
              {wizardData.workingHours.map((hours, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Checkbox
                    checked={hours.isOpen}
                    onCheckedChange={(checked) => {
                      const newHours = [...wizardData.workingHours];
                      newHours[index].isOpen = !!checked;
                      setWizardData({ ...wizardData, workingHours: newHours });
                    }}
                  />

                  <div className="w-24">
                    <span className="text-sm font-medium">
                      {t(`common.days.${DAYS_OF_WEEK[index].toLowerCase()}`)}
                    </span>
                  </div>

                  {hours.isOpen ? (
                    <>
                      <Input
                        type="time"
                        value={hours.openTime}
                        onChange={(e) => {
                          const newHours = [...wizardData.workingHours];
                          newHours[index].openTime = e.target.value;
                          setWizardData({ ...wizardData, workingHours: newHours });
                        }}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={hours.closeTime}
                        onChange={(e) => {
                          const newHours = [...wizardData.workingHours];
                          newHours[index].closeTime = e.target.value;
                          setWizardData({ ...wizardData, workingHours: newHours });
                        }}
                        className="w-32"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("wizard.step4.closed")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">{t("wizard.step4.hint")}</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Users className="h-5 w-5" />
              <h3 className="font-medium">{t("wizard.step5.title")}</h3>
            </div>

            <div className="p-6 bg-muted rounded-lg text-center">
              <Check className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-medium text-lg mb-2">{t("wizard.step5.readyTitle")}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {t("wizard.step5.readyDescription")}
              </p>
              <p className="text-xs text-muted-foreground">{t("wizard.step5.draftNote")}</p>
            </div>

            <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>{t("wizard.step5.important")}:</strong> {t("wizard.step5.activationNote")}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("wizard.title")}</DialogTitle>
          <DialogDescription>{t("wizard.description")}</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 5 && <div className="w-12 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t("wizard.back")}
          </Button>

          <span className="text-sm text-muted-foreground">
            {t("wizard.stepProgress", { current: step, total: 5 })}
          </span>

          {step < 5 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              {t("wizard.next")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={createSalonMutation.isPending}>
              {createSalonMutation.isPending ? t("common.creating") : t("wizard.createSalon")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
