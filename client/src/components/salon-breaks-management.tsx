import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";

interface SalonBreak {
  id: string;
  salonId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
  createdAt: string;
}

interface SalonBreaksManagementProps {
  salonId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: { en: "Sunday", ru: "Воскресенье", uz: "Yakshanba" } },
  { value: 1, label: { en: "Monday", ru: "Понедельник", uz: "Dushanba" } },
  { value: 2, label: { en: "Tuesday", ru: "Вторник", uz: "Seshanba" } },
  { value: 3, label: { en: "Wednesday", ru: "Среда", uz: "Chorshanba" } },
  { value: 4, label: { en: "Thursday", ru: "Четверг", uz: "Payshanba" } },
  { value: 5, label: { en: "Friday", ru: "Пятница", uz: "Juma" } },
  { value: 6, label: { en: "Saturday", ru: "Суббота", uz: "Shanba" } },
];

export function SalonBreaksManagement({ salonId }: SalonBreaksManagementProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentLang = i18n.language as "en" | "ru" | "uz";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBreak, setEditingBreak] = useState<SalonBreak | null>(null);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "14:00",
    label: "",
  });

  // Fetch breaks
  const { data: breaks = [], isLoading } = useQuery<SalonBreak[]>({
    queryKey: [`/api/owner/salons/${salonId}/breaks`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/salons/${salonId}/breaks`);
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/breaks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/breaks`] });
      toast({
        title: t("workingHours.breaks.createSuccess", "Break created"),
        description: t("workingHours.breaks.createSuccessDesc", "Break period has been added"),
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.breaks.createError", "Failed to create break"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { breakId: string }) => {
      return apiRequest("PATCH", `/api/owner/salons/${salonId}/breaks/${data.breakId}`, {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        label: data.label,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/breaks`] });
      toast({
        title: t("workingHours.breaks.updateSuccess", "Break updated"),
      });
      setDialogOpen(false);
      setEditingBreak(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.breaks.updateError", "Failed to update break"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (breakId: string) => {
      return apiRequest("DELETE", `/api/owner/salons/${salonId}/breaks/${breakId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/breaks`] });
      toast({
        title: t("workingHours.breaks.deleteSuccess", "Break deleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.breaks.deleteError", "Failed to delete break"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      dayOfWeek: 1,
      startTime: "13:00",
      endTime: "14:00",
      label: "",
    });
  };

  const handleOpenDialog = (breakToEdit?: SalonBreak) => {
    if (breakToEdit) {
      setEditingBreak(breakToEdit);
      setFormData({
        dayOfWeek: breakToEdit.dayOfWeek,
        startTime: breakToEdit.startTime,
        endTime: breakToEdit.endTime,
        label: breakToEdit.label || "",
      });
    } else {
      setEditingBreak(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    // Validation
    if (formData.startTime >= formData.endTime) {
      toast({
        title: t("common.error", "Error"),
        description: t("workingHours.breaks.invalidTime", "End time must be after start time"),
        variant: "destructive",
      });
      return;
    }

    if (editingBreak) {
      updateMutation.mutate({ ...formData, breakId: editingBreak.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (breakId: string) => {
    if (confirm(t("workingHours.breaks.confirmDelete", "Are you sure you want to delete this break?"))) {
      deleteMutation.mutate(breakId);
    }
  };

  // Group breaks by day of week
  const breaksByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    breaks: breaks.filter(b => b.dayOfWeek === day.value),
  }));

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading", "Loading...")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("workingHours.breaks.title", "Break Times")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("workingHours.breaks.description", "Define break periods when the salon is not accepting bookings")}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("workingHours.breaks.addBreak", "Add Break")}
        </Button>
      </div>

      <div className="grid gap-4">
        {breaksByDay.map(day => (
          <Card key={day.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{day.label[currentLang]}</CardTitle>
            </CardHeader>
            <CardContent>
              {day.breaks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("workingHours.breaks.noBreaks", "No breaks defined")}
                </p>
              ) : (
                <div className="space-y-2">
                  {day.breaks.map(breakItem => (
                    <div
                      key={breakItem.id}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {breakItem.startTime} - {breakItem.endTime}
                        </span>
                        {breakItem.label && (
                          <span className="text-sm text-muted-foreground">({breakItem.label})</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(breakItem)}
                        >
                          {t("common.edit", "Edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(breakItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBreak
                ? t("workingHours.breaks.editBreak", "Edit Break")
                : t("workingHours.breaks.addBreak", "Add Break")}
            </DialogTitle>
            <DialogDescription>
              {t("workingHours.breaks.dialogDescription", "Set the time period when the salon will not accept bookings")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Day of Week */}
            <div className="space-y-2">
              <Label>{t("workingHours.dayOfWeek", "Day of Week")}</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label[currentLang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">{t("workingHours.breaks.startTime", "Start Time")}</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="endTime">{t("workingHours.breaks.endTime", "End Time")}</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">
                {t("workingHours.breaks.label", "Label")} ({t("common.optional", "Optional")})
              </Label>
              <Input
                id="label"
                placeholder={t("workingHours.breaks.labelPlaceholder", "e.g., Lunch Break")}
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? t("common.saving", "Saving...")
                : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
