import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";

interface OwnerSalonServicesProps {
  salonId: string;
}

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
  "other",
];

function getLocalizedText(
  obj: { en: string; ru: string; uz: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

export function OwnerSalonServices({ salonId }: OwnerSalonServicesProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { toast } = useToast();

  const [newService, setNewService] = useState({
    nameEn: "",
    nameRu: "",
    nameUz: "",
    category: "haircut",
    priceMin: "",
    priceMax: "",
    duration: "60",
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/owner/salons", salonId, "services"],
  });

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
        variant: "destructive",
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
    onError: (error: any) => {
      toast({
        title: t("marketplace.owner.error"),
        description: error.message || t("marketplace.owner.deleteServiceError"),
        variant: "destructive",
      });
    },
  });

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    createServiceMutation.mutate({
      name: {
        en: newService.nameEn,
        ru: newService.nameRu || newService.nameEn,
        uz: newService.nameUz || newService.nameEn,
      },
      category: newService.category,
      priceMin: parseInt(newService.priceMin),
      priceMax: newService.priceMax ? parseInt(newService.priceMax) : null,
      duration: parseInt(newService.duration),
    });
  };

  return (
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
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`marketplace.categories.${cat}`)}
                  </option>
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
              <Label>
                {t("marketplace.owner.duration")} ({t("marketplace.owner.minutes")})
              </Label>
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

          <Button
            type="submit"
            disabled={createServiceMutation.isPending}
            data-testid="button-add-service"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createServiceMutation.isPending
              ? t("marketplace.owner.adding")
              : t("marketplace.owner.addService")}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.servicesList")}</h3>
        {servicesLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
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
                    {t(`marketplace.categories.${service.category}`)} • {service.duration}{" "}
                    {t("marketplace.owner.min")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-foreground">
                    {service.priceMin.toLocaleString()}{" "}
                    {service.priceMax ? `- ${service.priceMax.toLocaleString()}` : ""} UZS
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
          <p className="text-muted-foreground text-center py-8">
            {t("marketplace.owner.noServices")}
          </p>
        )}
      </Card>
    </div>
  );
}
