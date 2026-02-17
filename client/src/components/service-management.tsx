import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { GripVertical, Pencil, Copy, Eye, EyeOff, TrendingUp, Calendar, Plus, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

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
  isSelected,
  onSelect,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDuplicate: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  isSelected: boolean;
  onSelect: (serviceId: string, checked: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
  });

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
            {/* Selection Checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(service.id, !!checked)}
              className="mt-1"
            />

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
                  {service.isActive
                    ? t("services.active", "Active")
                    : t("services.inactive", "Inactive")}
                </Badge>
              </div>

              {serviceDesc && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{serviceDesc}</p>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <span className="font-medium">
                  {formatCurrency(service.priceMin)}
                  {service.priceMax > service.priceMin && ` - ${formatCurrency(service.priceMax)}`}
                </span>
                <span>•</span>
                <span>
                  {service.duration} {t("services.minutes", "min")}
                </span>
                <span>•</span>
                <span className="capitalize">{service.category}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>
                    {service.bookingCount} {t("services.bookings", "bookings")}
                  </span>
                </div>
                {service.lastBookedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>
                      {t("services.lastBooked", "Last:")}{" "}
                      {new Date(service.lastBookedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(service)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(service)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onToggleActive(service)}>
                {service.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
  const [creatingService, setCreatingService] = useState(false);
  const [duplicatingService, setDuplicatingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [createFormData, setCreateFormData] = useState<EditFormData>({
    name: { en: "", ru: "", uz: "" },
    description: { en: "", ru: "", uz: "" },
    category: "hair",
    priceMin: 0,
    priceMax: 0,
    duration: 60,
    isActive: true,
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [assignedMasters, setAssignedMasters] = useState<string[]>([]);

  // Fetch services
  const { data: servicesData, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/owner/services/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/services/stats");
      return res.json();
    },
  });

  // Update services state when data changes
  useEffect(() => {
    if (servicesData) {
      setServices(servicesData);
    }
  }, [servicesData]);

  // Fetch owner salons for duplication
  const { data: salons = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/salons"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/salons");
      return res.json();
    },
  });

  // Fetch masters for the service's salon
  const { data: salonMasters = [] } = useQuery<any[]>({
    queryKey: [`/api/owner/salons/${editingService?.salonId}/masters`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/salons/${editingService?.salonId}/masters`);
      return res.json();
    },
    enabled: !!editingService?.salonId,
  });

  // Fetch assigned masters when editing a service
  const { data: assignedMastersData } = useQuery<{ masterIds: string[] }>({
    queryKey: [`/api/owner/services/${editingService?.id}/masters`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/services/${editingService?.id}/masters`);
      return res.json();
    },
    enabled: !!editingService?.id,
  });

  // Update assigned masters state when data changes
  useEffect(() => {
    if (assignedMastersData) {
      setAssignedMasters(assignedMastersData.masterIds || []);
    }
  }, [assignedMastersData]);

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({
      salonId,
      serviceId,
      data,
    }: {
      salonId: string;
      serviceId: string;
      data: EditFormData;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/owner/salons/${salonId}/services/${serviceId}`,
        data,
      );
    },
    onSuccess: () => {
      toast({
        title: t("services.updateSuccess", "Service updated successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
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

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async ({ salonId, data }: { salonId: string; data: EditFormData }) => {
      const res = await apiRequest("POST", `/api/owner/salons/${salonId}/services`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("services.createSuccess", "Service created successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
      setCreatingService(false);
      setCreateFormData({
        name: { en: "", ru: "", uz: "" },
        description: { en: "", ru: "", uz: "" },
        category: "hair",
        priceMin: 0,
        priceMax: 0,
        duration: 60,
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: t("services.createError", "Failed to create service"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async ({ salonId, serviceId }: { salonId: string; serviceId: string }) => {
      const res = await apiRequest("DELETE", `/api/owner/salons/${salonId}/services/${serviceId}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.message) {
        toast({
          title: t("services.deactivated", "Service Deactivated"),
          description: data.message,
        });
      } else {
        toast({
          title: t("services.deleteSuccess", "Service deleted successfully"),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
      setDeletingService(null);
    },
    onError: (error: any) => {
      toast({
        title: t("services.deleteError", "Failed to delete service"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate service mutation
  const duplicateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: DuplicateFormData }) => {
      const res = await apiRequest("POST", `/api/owner/services/${serviceId}/duplicate`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("services.duplicateSuccess", "Service duplicated successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
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

  // Toggle service active status mutation (Phase 9)
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/owner/services/${serviceId}/toggle`, {
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t("services.toggleError", "Failed to toggle service"),
        description: error.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
    },
  });

  // Bulk toggle services mutation (Phase 9)
  const bulkToggleMutation = useMutation({
    mutationFn: async ({ serviceIds, isActive }: { serviceIds: string[]; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/owner/services/bulk-toggle", {
        serviceIds,
        isActive,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: t("services.bulkToggleSuccess", "Services updated"),
        description: t(
          "services.bulkToggleDesc",
          `${variables.serviceIds.length} services ${variables.isActive ? "activated" : "deactivated"}`,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
      setSelectedServices([]);
    },
    onError: (error: any) => {
      toast({
        title: t("services.bulkToggleError", "Failed to update services"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign masters to service mutation (Phase 9)
  const assignMastersMutation = useMutation({
    mutationFn: async ({ serviceId, masterIds }: { serviceId: string; masterIds: string[] }) => {
      const res = await apiRequest("PATCH", `/api/owner/services/${serviceId}/masters`, {
        masterIds,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("services.assignMastersSuccess", "Masters assigned successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t("services.assignMastersError", "Failed to assign masters"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder services mutation
  const reorderMutation = useMutation({
    mutationFn: async (data: { services: Array<{ id: string; displayOrder: number }> }) => {
      const res = await apiRequest("PUT", "/api/owner/services/reorder", data);
      return res.json();
    },
    onError: (error: any) => {
      toast({
        title: t("services.reorderError", "Failed to reorder services"),
        description: error.message,
        variant: "destructive",
      });
      // Revert to original order
      queryClient.invalidateQueries({ queryKey: ["/api/owner/services/stats"] });
    },
  });

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
    // Reset assigned masters - will be loaded by query
    setAssignedMasters([]);
  };

  const handleDuplicate = (service: Service) => {
    setDuplicatingService(service);
  }; const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const handleCreate = () => {
    if (salons.length === 0) return;

    createServiceMutation.mutate({
      salonId: salons[0].id, // Default to first salon for now, or add selector in dialog
      data: createFormData,
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingService) return;
    deleteServiceMutation.mutate({
      salonId: deletingService.salonId,
      serviceId: deletingService.id,
    });
  };

  const handleToggleActive = (service: Service) => {
    toggleServiceMutation.mutate({
      serviceId: service.id,
      isActive: !service.isActive,
    });
  };

  const handleSaveEdit = () => {
    if (!editingService || !editFormData) return;

    // Save service data
    updateServiceMutation.mutate({
      salonId: editingService.salonId,
      serviceId: editingService.id,
      data: editFormData,
    });

    // Save master assignments
    assignMastersMutation.mutate({
      serviceId: editingService.id,
      masterIds: assignedMasters,
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
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t("services.management", "Service Management")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "services.dragToReorder",
                "Drag services to reorder them. Edit, duplicate, or toggle visibility.",
              )}
            </p>
          </div>
          {salons.length > 0 && (
            <Button
              onClick={() => setCreatingService(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("marketplace.owner.addService", "Add Service")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Bulk Actions Bar */}
          {selectedServices.length > 0 && (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {selectedServices.length} {t("services.selected", "selected")}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      bulkToggleMutation.mutate({
                        serviceIds: selectedServices,
                        isActive: true,
                      });
                    }}
                    disabled={bulkToggleMutation.isPending}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t("services.activateSelected", "Activate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      bulkToggleMutation.mutate({
                        serviceIds: selectedServices,
                        isActive: false,
                      });
                    }}
                    disabled={bulkToggleMutation.isPending}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    {t("services.deactivateSelected", "Deactivate")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedServices([])}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {services.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t(
                  "services.noServices",
                  "No services found. Create services in your salon settings.",
                )}
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
                  <div key={service.id} className="relative group">
                    <SortableServiceItem
                      service={service}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onToggleActive={handleToggleActive}
                      isSelected={selectedServices.includes(service.id)}
                      onSelect={(serviceId, checked) => {
                        if (checked) {
                          setSelectedServices([...selectedServices, serviceId]);
                        } else {
                          setSelectedServices(selectedServices.filter((id) => id !== serviceId));
                        }
                      }}
                    />
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent drag
                          handleDelete(service);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive/90 bg-white/80 backdrop-blur-sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      <Dialog
        open={!!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setEditingService(null);
            setAssignedMasters([]);
          }
        }}
      >
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
                  onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
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

              {/* Assigned Masters */}
              <div className="space-y-2">
                <Label>{t("services.assignedMasters", "Assigned Masters")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "services.assignedMastersDesc",
                    "Select which masters can perform this service",
                  )}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {salonMasters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("services.noMasters", "No masters available for this salon")}
                    </p>
                  ) : (
                    salonMasters.map((master: any) => (
                      <div key={master.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`master-${master.id}`}
                          checked={assignedMasters.includes(master.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAssignedMasters([...assignedMasters, master.id]);
                            } else {
                              setAssignedMasters(assignedMasters.filter((id) => id !== master.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`master-${master.id}`}
                          className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {typeof master.name === "object"
                            ? master.name.en || master.name.ru || master.name.uz
                            : master.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignedMasters.length} {t("services.mastersSelected", "master(s) selected")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateServiceMutation.isPending}>
              {updateServiceMutation.isPending
                ? t("common.saving", "Saving...")
                : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Service Dialog */}
      <Dialog open={!!duplicatingService} onOpenChange={() => setDuplicatingService(null)}>
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
            <Button variant="outline" onClick={() => setDuplicatingService(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Service Dialog */}
      <Dialog open={creatingService} onOpenChange={setCreatingService}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("services.createService", "Create Service")}</DialogTitle>
            <DialogDescription>
              {t("services.createDescription", "Add a new service to your salon")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("services.name", "Service Name")}</Label>
              <Input
                placeholder="English"
                value={createFormData.name.en}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    name: { ...createFormData.name, en: e.target.value },
                  })
                }
              />
              <Input
                placeholder="Русский"
                value={createFormData.name.ru}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    name: { ...createFormData.name, ru: e.target.value },
                  })
                }
              />
              <Input
                placeholder="O'zbek"
                value={createFormData.name.uz}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    name: { ...createFormData.name, uz: e.target.value },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("services.category", "Category")}</Label>
              <Select
                value={createFormData.category}
                onValueChange={(value) => setCreateFormData({ ...createFormData, category: value })}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("services.priceMin", "Min Price")}</Label>
                <Input
                  type="number"
                  value={createFormData.priceMin}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      priceMin: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("services.priceMax", "Max Price")}</Label>
                <Input
                  type="number"
                  value={createFormData.priceMax}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      priceMax: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("services.duration", "Duration (minutes)")}</Label>
              <Input
                type="number"
                value={createFormData.duration}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    duration: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingService(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createServiceMutation.isPending}>
              {createServiceMutation.isPending
                ? t("common.creating", "Creating...")
                : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("services.deleteTitle", "Delete Service")}</DialogTitle>
            <DialogDescription>
              {t("services.deleteConfirm", "Are you sure you want to delete this service? This action cannot be undone.")}
              {deletingService?.bookingCount && deletingService.bookingCount > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
                  {t("services.hasBookingsWarning", "Warning: This service has existing bookings. It will be deactivated instead of deleted.")}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingService(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteServiceMutation.isPending}>
              {deleteServiceMutation.isPending ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
