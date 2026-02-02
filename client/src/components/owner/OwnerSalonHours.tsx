import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SalonBreaksManagement } from "@/components/salon-breaks-management";
import { SalonExceptionsManagement } from "@/components/salon-exceptions-management";
import type { WorkingHours } from "@shared/schema";

interface OwnerSalonHoursProps {
  salonId: string;
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

export function OwnerSalonHours({ salonId }: OwnerSalonHoursProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [workingHours, setWorkingHours] = useState<{
    [key: number]: { open: string; close: string; closed: boolean };
  }>({
    0: { open: "09:00", close: "18:00", closed: true },
    1: { open: "09:00", close: "20:00", closed: false },
    2: { open: "09:00", close: "20:00", closed: false },
    3: { open: "09:00", close: "20:00", closed: false },
    4: { open: "09:00", close: "20:00", closed: false },
    5: { open: "09:00", close: "20:00", closed: false },
    6: { open: "10:00", close: "18:00", closed: false },
  });

  const { data: savedHours } = useQuery<WorkingHours[]>({
    queryKey: ["/api/owner/salons", salonId, "hours"],
  });

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      const hoursMap: { [key: number]: { open: string; close: string; closed: boolean } } = {};
      savedHours.forEach((h) => {
        hoursMap[h.dayOfWeek] = {
          open: h.openTime,
          close: h.closeTime,
          closed: h.isClosed ?? false,
        };
      });
      setWorkingHours((prev) => ({ ...prev, ...hoursMap }));
    }
  }, [savedHours]);

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
        variant: "destructive",
      });
    },
  });

  const handleSaveHours = () => {
    const hoursData = Object.entries(workingHours).map(([day, hours]) => ({
      dayOfWeek: parseInt(day),
      openTime: hours.open,
      closeTime: hours.close,
      isClosed: hours.closed,
    }));
    saveHoursMutation.mutate({ hours: hoursData });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-foreground">{t("marketplace.owner.workingHours")}</h3>
          <Button
            onClick={handleSaveHours}
            disabled={saveHoursMutation.isPending}
            data-testid="button-save-hours"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveHoursMutation.isPending
              ? t("marketplace.owner.saving")
              : t("marketplace.owner.saveHours")}
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
                  onChange={(e) =>
                    setWorkingHours({
                      ...workingHours,
                      [day.value]: { ...workingHours[day.value], closed: e.target.checked },
                    })
                  }
                  className="h-4 w-4"
                  data-testid={`checkbox-closed-${day.value}`}
                />
                <span className="text-sm text-muted-foreground">
                  {t("marketplace.owner.closed")}
                </span>
              </label>

              {!workingHours[day.value]?.closed && (
                <>
                  <Input
                    type="time"
                    value={workingHours[day.value]?.open || "09:00"}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        [day.value]: { ...workingHours[day.value], open: e.target.value },
                      })
                    }
                    className="w-32"
                    data-testid={`input-open-${day.value}`}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={workingHours[day.value]?.close || "20:00"}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        [day.value]: { ...workingHours[day.value], close: e.target.value },
                      })
                    }
                    className="w-32"
                    data-testid={`input-close-${day.value}`}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6">
        <SalonBreaksManagement salonId={salonId} />
      </div>

      <div className="mt-6">
        <SalonExceptionsManagement salonId={salonId} />
      </div>
    </div>
  );
}
