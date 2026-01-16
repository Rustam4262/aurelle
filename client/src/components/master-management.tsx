import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Star,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Upload,
  X,
  Clock,
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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface Master {
  id: string;
  salonId: string;
  salonName: string;
  userId?: string;
  name: {
    en: string;
    ru: string;
    uz: string;
  };
  email?: string;
  phone?: string;
  specialization?: string;
  bio?: {
    en: string;
    ru: string;
    uz: string;
  };
  portfolio?: string[];
  workingHours?: Record<string, { start: string; end: string; isWorking: boolean }>;
  isActive: boolean;
  rating?: number;
  reviewCount?: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
}

interface EditFormData {
  name: {
    en: string;
    ru: string;
    uz: string;
  };
  bio: {
    en: string;
    ru: string;
    uz: string;
  };
  specialization: string;
  phone: string;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function MasterManagement() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingMaster, setEditingMaster] = useState<Master | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; isWorking: boolean }>>({});
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Fetch masters
  const { data: masters = [], isLoading } = useQuery<Master[]>({
    queryKey: ["/api/owner/masters/stats"],
    queryFn: () => apiRequest("GET", "/api/owner/masters/stats"),
  });

  // Update master mutation
  const updateMasterMutation = useMutation({
    mutationFn: ({ salonId, masterId, data }: { salonId: string; masterId: string; data: any }) =>
      apiRequest("PUT", `/api/owner/salons/${salonId}/masters/${masterId}`, data),
    onSuccess: () => {
      toast({
        title: t("masters.updateSuccess", "Master updated successfully"),
      });
      queryClient.invalidateQueries(["/api/owner/masters/stats"]);
      setEditingMaster(null);
      setEditFormData(null);
    },
    onError: (error: any) => {
      toast({
        title: t("masters.updateError", "Failed to update master"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload portfolio mutation
  const uploadPortfolioMutation = useMutation({
    mutationFn: ({ masterId, imageUrl }: { masterId: string; imageUrl: string }) =>
      apiRequest("POST", `/api/owner/masters/${masterId}/portfolio`, { imageUrl }),
    onSuccess: () => {
      toast({
        title: t("masters.portfolioUploadSuccess", "Portfolio image added"),
      });
      queryClient.invalidateQueries(["/api/owner/masters/stats"]);
      setPortfolioUrl("");
    },
    onError: (error: any) => {
      toast({
        title: t("masters.portfolioUploadError", "Failed to upload image"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete portfolio mutation
  const deletePortfolioMutation = useMutation({
    mutationFn: ({ masterId, imageIndex }: { masterId: string; imageIndex: number }) =>
      apiRequest("DELETE", `/api/owner/masters/${masterId}/portfolio/${imageIndex}`),
    onSuccess: () => {
      toast({
        title: t("masters.portfolioDeleteSuccess", "Portfolio image removed"),
      });
      queryClient.invalidateQueries(["/api/owner/masters/stats"]);
    },
    onError: (error: any) => {
      toast({
        title: t("masters.portfolioDeleteError", "Failed to delete image"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (master: Master) => {
    setEditingMaster(master);
    setEditFormData({
      name: master.name,
      bio: master.bio || { en: "", ru: "", uz: "" },
      specialization: master.specialization || "",
      phone: master.phone || "",
      isActive: master.isActive,
    });
    setWorkingHours(master.workingHours || {});
  };

  const handleToggleActive = (master: Master) => {
    updateMasterMutation.mutate({
      salonId: master.salonId,
      masterId: master.id,
      data: {
        isActive: !master.isActive,
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingMaster || !editFormData) return;

    updateMasterMutation.mutate({
      salonId: editingMaster.salonId,
      masterId: editingMaster.id,
      data: {
        ...editFormData,
        workingHours,
      },
    });
  };

  const handleUploadPortfolio = (masterId: string) => {
    if (!portfolioUrl.trim()) {
      toast({
        title: t("masters.invalidUrl", "Please enter a valid image URL"),
        variant: "destructive",
      });
      return;
    }

    uploadPortfolioMutation.mutate({ masterId, imageUrl: portfolioUrl });
  };

  const handleDeletePortfolio = (masterId: string, imageIndex: number) => {
    deletePortfolioMutation.mutate({ masterId, imageIndex });
  };

  const currentLang = i18n.language as "en" | "ru" | "uz";

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
          <CardTitle>{t("masters.management", "Master Management")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("masters.manageDescription", "Manage your masters, view their performance, and update their profiles.")}
          </p>
        </CardHeader>
        <CardContent>
          {masters.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t("masters.noMasters", "No masters found. Add masters in your salon settings.")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {masters.map((master) => {
                const masterName = master.name?.[currentLang] || master.name?.en || "Unknown";
                const masterBio = master.bio?.[currentLang] || master.bio?.en || "";
                const completionRate = master.totalBookings > 0
                  ? Math.round((master.completedBookings / master.totalBookings) * 100)
                  : 0;

                return (
                  <Card key={master.id} className={!master.isActive ? "opacity-60" : ""}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={master.portfolio?.[0]} />
                          <AvatarFallback>{masterName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-lg truncate">{masterName}</h3>
                            <Badge variant={master.isActive ? "default" : "secondary"}>
                              {master.isActive ? t("masters.active", "Active") : t("masters.inactive", "Inactive")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{master.salonName}</p>
                          {master.specialization && (
                            <p className="text-sm text-muted-foreground capitalize">{master.specialization}</p>
                          )}
                        </div>
                      </div>

                      {masterBio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{masterBio}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{master.rating?.toFixed(1) || "N/A"}</span>
                          <span className="text-muted-foreground">({master.reviewCount || 0})</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span>{master.totalBookings} {t("masters.bookings", "bookings")}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>{completionRate}% {t("masters.completed", "completed")}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          <span className="truncate">{formatCurrency(master.totalRevenue)}</span>
                        </div>
                      </div>

                      {master.portfolio && master.portfolio.length > 0 && (
                        <div className="mb-4">
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {master.portfolio.slice(0, 4).map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Portfolio ${idx + 1}`}
                                className="h-16 w-16 object-cover rounded border"
                              />
                            ))}
                            {master.portfolio.length > 4 && (
                              <div className="h-16 w-16 flex items-center justify-center rounded border bg-muted text-sm">
                                +{master.portfolio.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(master)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("common.edit", "Edit")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(master)}
                        >
                          {master.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Master Dialog */}
      <Dialog open={!!editingMaster} onOpenChange={() => setEditingMaster(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masters.editMaster", "Edit Master")}</DialogTitle>
            <DialogDescription>
              {t("masters.editDescription", "Update master profile, working hours, and portfolio")}
            </DialogDescription>
          </DialogHeader>

          {editFormData && editingMaster && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">{t("masters.profile", "Profile")}</TabsTrigger>
                <TabsTrigger value="schedule">{t("masters.schedule", "Schedule")}</TabsTrigger>
                <TabsTrigger value="portfolio">{t("masters.portfolio", "Portfolio")}</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                {/* Name fields */}
                <div className="space-y-2">
                  <Label>{t("masters.name", "Master Name")}</Label>
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

                {/* Bio fields */}
                <div className="space-y-2">
                  <Label>{t("masters.bio", "Biography")}</Label>
                  <Textarea
                    placeholder="English"
                    value={editFormData.bio.en}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bio: { ...editFormData.bio, en: e.target.value },
                      })
                    }
                  />
                  <Textarea
                    placeholder="Русский"
                    value={editFormData.bio.ru}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bio: { ...editFormData.bio, ru: e.target.value },
                      })
                    }
                  />
                  <Textarea
                    placeholder="O'zbek"
                    value={editFormData.bio.uz}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bio: { ...editFormData.bio, uz: e.target.value },
                      })
                    }
                  />
                </div>

                {/* Specialization */}
                <div className="space-y-2">
                  <Label>{t("masters.specialization", "Specialization")}</Label>
                  <Input
                    value={editFormData.specialization}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, specialization: e.target.value })
                    }
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>{t("masters.phone", "Phone")}</Label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const daySchedule = workingHours[day.key] || {
                      start: "09:00",
                      end: "18:00",
                      isWorking: false,
                    };

                    return (
                      <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 w-32">
                          <Switch
                            checked={daySchedule.isWorking}
                            onCheckedChange={(checked) =>
                              setWorkingHours({
                                ...workingHours,
                                [day.key]: { ...daySchedule, isWorking: checked },
                              })
                            }
                          />
                          <Label className="text-sm font-medium">{day.label}</Label>
                        </div>

                        {daySchedule.isWorking && (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input
                                type="time"
                                value={daySchedule.start}
                                onChange={(e) =>
                                  setWorkingHours({
                                    ...workingHours,
                                    [day.key]: { ...daySchedule, start: e.target.value },
                                  })
                                }
                                className="w-32"
                              />
                            </div>
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={daySchedule.end}
                              onChange={(e) =>
                                setWorkingHours({
                                  ...workingHours,
                                  [day.key]: { ...daySchedule, end: e.target.value },
                                })
                              }
                              className="w-32"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="portfolio" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("masters.addImage", "Add Image URL")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button
                      onClick={() => handleUploadPortfolio(editingMaster.id)}
                      disabled={uploadPortfolioMutation.isPending}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {editingMaster.portfolio && editingMaster.portfolio.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {editingMaster.portfolio.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Portfolio ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePortfolio(editingMaster.id, idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaster(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMasterMutation.isPending}>
              {updateMasterMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
