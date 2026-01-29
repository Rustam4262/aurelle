import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SalonException {
  id: string;
  salonId: string;
  exceptionDate: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
  createdAt: string;
}

interface SalonExceptionsManagementProps {
  salonId: string;
}

export function SalonExceptionsManagement({ salonId }: SalonExceptionsManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingException, setEditingException] = useState<SalonException | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    isClosed: true,
    openTime: "",
    closeTime: "",
    reason: "",
  });

  // Fetch exceptions (next 6 months)
  const today = new Date();
  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(today.getMonth() + 6);

  const { data: exceptions = [], isLoading } = useQuery<SalonException[]>({
    queryKey: [`/api/owner/salons/${salonId}/exceptions`],
    queryFn: async () => {
      const from = format(today, "yyyy-MM-dd");
      const to = format(sixMonthsLater, "yyyy-MM-dd");
      const res = await apiRequest(
        "GET",
        `/api/owner/salons/${salonId}/exceptions?from=${from}&to=${to}`,
      );
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/exceptions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/exceptions`] });
      toast({
        title: t("workingHours.exceptions.createSuccess", "Exception created"),
        description: t(
          "workingHours.exceptions.createSuccessDesc",
          "Date exception has been added",
        ),
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.exceptions.createError", "Failed to create exception"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any & { exceptionId: string }) => {
      const { exceptionId, ...payload } = data;
      return apiRequest("PATCH", `/api/owner/salons/${salonId}/exceptions/${exceptionId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/exceptions`] });
      toast({
        title: t("workingHours.exceptions.updateSuccess", "Exception updated"),
      });
      setDialogOpen(false);
      setEditingException(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.exceptions.updateError", "Failed to update exception"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      return apiRequest("DELETE", `/api/owner/salons/${salonId}/exceptions/${exceptionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/exceptions`] });
      toast({
        title: t("workingHours.exceptions.deleteSuccess", "Exception deleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("workingHours.exceptions.deleteError", "Failed to delete exception"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDate(undefined);
    setFormData({
      isClosed: true,
      openTime: "",
      closeTime: "",
      reason: "",
    });
  };

  const handleOpenDialog = (exception?: SalonException) => {
    if (exception) {
      setEditingException(exception);
      setSelectedDate(new Date(exception.exceptionDate));
      setFormData({
        isClosed: exception.isClosed,
        openTime: exception.openTime || "",
        closeTime: exception.closeTime || "",
        reason: exception.reason || "",
      });
    } else {
      setEditingException(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedDate) {
      toast({
        title: t("common.error", "Error"),
        description: t("workingHours.exceptions.selectDate", "Please select a date"),
        variant: "destructive",
      });
      return;
    }

    // Validation for custom hours
    if (!formData.isClosed && formData.openTime && formData.closeTime) {
      if (formData.openTime >= formData.closeTime) {
        toast({
          title: t("common.error", "Error"),
          description: t(
            "workingHours.exceptions.invalidTime",
            "Close time must be after open time",
          ),
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      exceptionDate: format(selectedDate, "yyyy-MM-dd"),
      isClosed: formData.isClosed,
      openTime: formData.isClosed ? null : formData.openTime || null,
      closeTime: formData.isClosed ? null : formData.closeTime || null,
      reason: formData.reason || null,
    };

    if (editingException) {
      updateMutation.mutate({ ...payload, exceptionId: editingException.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (exceptionId: string) => {
    if (
      confirm(
        t(
          "workingHours.exceptions.confirmDelete",
          "Are you sure you want to delete this exception?",
        ),
      )
    ) {
      deleteMutation.mutate(exceptionId);
    }
  };

  // Sort exceptions by date
  const sortedExceptions = [...exceptions].sort(
    (a, b) => new Date(a.exceptionDate).getTime() - new Date(b.exceptionDate).getTime(),
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading", "Loading...")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {t("workingHours.exceptions.title", "Exceptions & Holidays")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              "workingHours.exceptions.description",
              "Define special dates when salon is closed or has custom hours",
            )}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("workingHours.exceptions.addException", "Add Exception")}
        </Button>
      </div>

      {sortedExceptions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              {t(
                "workingHours.exceptions.noExceptions",
                "No exceptions defined for the next 6 months",
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {sortedExceptions.map((exception) => {
            const exDate = new Date(exception.exceptionDate);
            return (
              <Card key={exception.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{format(exDate, "PPP")}</span>
                        {exception.isClosed ? (
                          <span className="inline-flex items-center gap-1 text-sm text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {t("workingHours.exceptions.closed", "Closed")}
                          </span>
                        ) : (
                          <span className="text-sm text-amber-600">
                            {t("workingHours.exceptions.customHours", "Custom Hours")}:{" "}
                            {exception.openTime} - {exception.closeTime}
                          </span>
                        )}
                      </div>
                      {exception.reason && (
                        <p className="text-sm text-muted-foreground ml-6">{exception.reason}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(exception)}>
                        {t("common.edit", "Edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(exception.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingException
                ? t("workingHours.exceptions.editException", "Edit Exception")
                : t("workingHours.exceptions.addException", "Add Exception")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "workingHours.exceptions.dialogDescription",
                "Mark a specific date as closed or with custom hours",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>{t("workingHours.exceptions.date", "Date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "PPP")
                      : t("workingHours.exceptions.pickDate", "Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Is Closed Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isClosed"
                checked={formData.isClosed}
                onCheckedChange={(checked) => setFormData({ ...formData, isClosed: !!checked })}
              />
              <label
                htmlFor="isClosed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("workingHours.exceptions.salonClosed", "Salon is fully closed on this date")}
              </label>
            </div>

            {/* Custom Hours (only if not closed) */}
            {!formData.isClosed && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openTime">
                    {t("workingHours.exceptions.openTime", "Open Time")}
                  </Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={formData.openTime}
                    onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">
                    {t("workingHours.exceptions.closeTime", "Close Time")}
                  </Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={formData.closeTime}
                    onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("workingHours.exceptions.reason", "Reason")} ({t("common.optional", "Optional")})
              </Label>
              <Textarea
                id="reason"
                placeholder={t(
                  "workingHours.exceptions.reasonPlaceholder",
                  "e.g., National Holiday, Renovation",
                )}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
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
