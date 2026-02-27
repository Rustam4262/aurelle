import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Loader2 } from "lucide-react";
import type { MasterWorkingHours } from "@shared/schema";

interface ScheduleDay {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface MasterScheduleProps {
  initialSchedule: MasterWorkingHours[] | undefined;
  onSave: (schedule: ScheduleDay[]) => void;
  isSaving: boolean;
  isLoading: boolean;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function MasterSchedule({
  initialSchedule,
  onSave,
  isSaving,
  isLoading,
}: MasterScheduleProps) {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);

  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      setSchedule(
        initialSchedule.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed ?? false,
        })),
      );
    } else if (schedule.length === 0) {
      setSchedule(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: i === 0,
        })),
      );
    }
  }, [initialSchedule]);

  const updateScheduleDay = (
    dayOfWeek: number,
    field: keyof ScheduleDay,
    value: ScheduleDay[keyof ScheduleDay],
  ) => {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day)),
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {t("marketplace.master.workingHours")}
        </h3>
        <Button onClick={() => onSave(schedule)} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("marketplace.master.saveSchedule")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
            const day = schedule.find((d) => d.dayOfWeek === dayOfWeek) || {
              dayOfWeek,
              openTime: "09:00",
              closeTime: "18:00",
              isClosed: dayOfWeek === 0,
            };
            return (
              <div
                key={dayOfWeek}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-md flex-wrap"
              >
                <div className="w-28 font-medium text-foreground">
                  {t(`marketplace.days.${DAY_NAMES[dayOfWeek]}`)}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!day.isClosed}
                    onCheckedChange={(checked) =>
                      updateScheduleDay(dayOfWeek, "isClosed", !checked)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {day.isClosed ? t("marketplace.master.closed") : t("marketplace.master.open")}
                  </span>
                </div>
                {!day.isClosed && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => updateScheduleDay(dayOfWeek, "openTime", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => updateScheduleDay(dayOfWeek, "closeTime", e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
