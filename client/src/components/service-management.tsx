import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Service {
  id: string;
  salonId: string;
  salonName: string;
  name: {
    en: string;
    ru: string;
    uz: string;
  };
  description?: {
    en: string;
    ru: string;
    uz: string;
  };
  category: string;
  priceMin: number;
  priceMax: number;
  duration: number;
  isActive: boolean;
  bookingCount: number;
  lastBookedAt?: string;
  displayOrder: number;
}

interface EditFormData {
  name: {
    en: string;
    ru: string;
    uz: string;
  };
  description: {
    en: string;
    ru: string;
    uz: string;
  };
  category: string;
  priceMin: number;
  priceMax: number;
  duration: number;
  isActive: boolean;
}

interface DuplicateFormData {
  targetSalonId: string;
}

function SortableServiceItem({
  service,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDuplicate: (service: Service) => void;
  onToggleActive: (service: Service) => void;
}) {
  const { t, i18n } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const currentLang = i18n.language as "en" | "ru" | "uz";
  const serviceName = service.name?.[currentLang] || service.name?.en || "Unknown";
  const serviceDesc = service.description?.[currentLang] || service.description?.en || "";

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className={!service.isActive ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <button
              className="cursor-move mt-1 text-gray-400 hover:text-gray-600"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Service Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-base truncate">{serviceName}</h3>
                  <p className="text-sm text-muted-foreground">{service.salonName}</p>
                </div>
                <Badge variant={service.isActive ? "default" : "secondary"}>
                  {service.isActive ? t("services.active", "Active") : t("services.inactive", "Inactive")}
                </Badge>
              </div>

              {serviceDesc && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {serviceDesc}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <span className="font-medium">
                  {formatCurrency(service.priceMin)}
                  {service.priceMax > service.priceMin && ` - ${formatCurrency(service.priceMax)}`}
                </span>
                <span>•</span>
                <span>{service.duration} {t("services.minutes", "min")}</span>
                <span>•</span>
                <span className="capitalize">{service.category}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>{service.bookingCount} {t("services.bookings", "bookings")}</span>
                </div>
                {service.lastBookedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>
                      {t("services.lastBooked", "Last:")} {new Date(service.lastBookedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(service)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(service)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(service)}
              >
                {service.isActive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ServiceManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [duplicatingService, setDuplicatingService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  // Fetch services
  const { data: servicesData, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/owner/services/stats"],
    queryFn: () => apiRequest("GET", "/api/owner/services/stats"),
    onSuccess: (data) => {
      setServices(data);
    },
  });

  // Fetch owner salons for duplication
  const { data: salons = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/salons"],
    queryFn: () => apiRequest("GET", "/api/owner/salons"),
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: ({ salonId, serviceId, data }: { salonId: string; serviceId: string; data: EditFormData }) =>
      apiRequest("PUT", `/api/owner/salons/${salonId}/services/${serviceId}`, data),
    onSuccess: () => {
      toast({
        title: t("services.updateSuccess", "Service updated successfully"),
      });
      queryClient.invalidateQueries(["/api/owner/services/stats"]);
      setEditingService(null);
      setEditFormData(null);
    },
    onError: (error: any) => {
      toast({
        title: t("services.updateError", "Failed to update service"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate service mutation
  const duplicateServiceMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: DuplicateFormData }) =>
      apiRequest("POST", `/api/owner/services/${serviceId}/duplicate`, data),
    onSuccess: () => {
      toast({
        title: t("services.duplicateSuccess", "Service duplicated successfully"),
      });
      queryClient.invalidateQueries(["/api/owner/services/stats"]);
      setDuplicatingService(null);
    },
    onError: (error: any) => {
      toast({
        title: t("services.duplicateError", "Failed to duplicate service"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder services mutation
  const reorderMutation = useMutation({
    mutationFn: (data: { services: Array<{ id: string; displayOrder: number }> }) =>
      apiRequest("PUT", "/api/owner/services/reorder", data),
    onError: (error: any) => {
      toast({
        title: t("services.reorderError", "Failed to reorder services"),
        description: error.message,
        variant: "destructive",
      });
      // Revert to original order
      queryClient.invalidateQueries(["/api/owner/services/stats"]);
    },
  });

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);

      // Update displayOrder for all affected services
      const reorderData = newServices.map((service, index) => ({
        id: service.id,
        displayOrder: index,
      }));

      reorderMutation.mutate({ services: reorderData });
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      name: service.name,
      description: service.description || { en: "", ru: "", uz: "" },
      category: service.category,
      priceMin: service.priceMin,
      priceMax: service.priceMax,
      duration: service.duration,
      isActive: service.isActive,
    });
  };

  const handleDuplicate = (service: Service) => {
    setDuplicatingService(service);
  };

  const handleToggleActive = (service: Service) => {
    updateServiceMutation.mutate({
      salonId: service.salonId,
      serviceId: service.id,
      data: {
        ...service,
        isActive: !service.isActive,
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingService || !editFormData) return;

    updateServiceMutation.mutate({
      salonId: editingService.salonId,
      serviceId: editingService.id,
      data: editFormData,
    });
  };

  const handleSaveDuplicate = (targetSalonId: string) => {
    if (!duplicatingService) return;

    duplicateServiceMutation.mutate({
      serviceId: duplicatingService.id,
      data: { targetSalonId },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("services.management", "Service Management")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("services.dragToReorder", "Drag services to reorder them. Edit, duplicate, or toggle visibility.")}
          </p>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t("services.noServices", "No services found. Create services in your salon settings.")}
              </AlertDescription>
            </Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={services.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {services.map((service) => (
                  <SortableServiceItem
                    key={service.id}
                    service={service}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("services.editService", "Edit Service")}</DialogTitle>
            <DialogDescription>
              {t("services.editDescription", "Update service details across all languages")}
            </DialogDescription>
          </DialogHeader>

          {editFormData && (
            <div className="space-y-4">
              {/* Name fields */}
              <div className="space-y-2">
                <Label>{t("services.name", "Service Name")}</Label>
                <Input
                  placeholder="English"
                  value={editFormData.name.en}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      name: { ...editFormData.name, en: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="Русский"
                  value={editFormData.name.ru}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      name: { ...editFormData.name, ru: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="O'zbek"
                  value={editFormData.name.uz}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      name: { ...editFormData.name, uz: e.target.value },
                    })
                  }
                />
              </div>

              {/* Description fields */}
              <div className="space-y-2">
                <Label>{t("services.description", "Description")}</Label>
                <Textarea
                  placeholder="English"
                  value={editFormData.description.en}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: { ...editFormData.description, en: e.target.value },
                    })
                  }
                />
                <Textarea
                  placeholder="Русский"
                  value={editFormData.description.ru}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: { ...editFormData.description, ru: e.target.value },
                    })
                  }
                />
                <Textarea
                  placeholder="O'zbek"
                  value={editFormData.description.uz}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: { ...editFormData.description, uz: e.target.value },
                    })
                  }
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t("services.category", "Category")}</Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hair">Hair</SelectItem>
                    <SelectItem value="nails">Nails</SelectItem>
                    <SelectItem value="makeup">Makeup</SelectItem>
                    <SelectItem value="massage">Massage</SelectItem>
                    <SelectItem value="skincare">Skincare</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("services.priceMin", "Min Price")}</Label>
                  <Input
                    type="number"
                    value={editFormData.priceMin}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        priceMin: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("services.priceMax", "Max Price")}</Label>
                  <Input
                    type="number"
                    value={editFormData.priceMax}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        priceMax: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>{t("services.duration", "Duration (minutes)")}</Label>
                <Input
                  type="number"
                  value={editFormData.duration}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      duration: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingService(null)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateServiceMutation.isPending}
            >
              {updateServiceMutation.isPending
                ? t("common.saving", "Saving...")
                : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Service Dialog */}
      <Dialog
        open={!!duplicatingService}
        onOpenChange={() => setDuplicatingService(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("services.duplicateService", "Duplicate Service")}</DialogTitle>
            <DialogDescription>
              {t("services.duplicateDescription", "Choose a salon to copy this service to")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label>{t("services.targetSalon", "Target Salon")}</Label>
            <Select
              onValueChange={(value) => handleSaveDuplicate(value)}
              disabled={duplicateServiceMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("services.selectSalon", "Select a salon")} />
              </SelectTrigger>
              <SelectContent>
                {salons
                  .filter((s) => s.id !== duplicatingService?.salonId)
                  .map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      {salon.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicatingService(null)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
