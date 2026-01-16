/**
 * Date Range Picker Component
 *
 * Allows selecting custom date ranges for analytics filtering
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESET_RANGES = [
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 days", getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
  { label: "This year", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const displayText = value
    ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
    : t("analytics.selectDateRange", "Select date range");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Preset ranges */}
          <div className="border-r p-3 space-y-1">
            <div className="text-sm font-medium mb-2">
              {t("analytics.quickRanges", "Quick Ranges")}
            </div>
            {PRESET_RANGES.map((preset, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePresetClick(preset)}
              >
                {t(`analytics.range.${preset.label.toLowerCase().replace(/\s+/g, "_")}`, preset.label)}
              </Button>
            ))}
          </div>

          {/* Custom date selection */}
          <div className="p-3">
            <div className="text-sm font-medium mb-2">
              {t("analytics.customRange", "Custom Range")}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("analytics.fromDate", "From")}
                </label>
                <CalendarComponent
                  mode="single"
                  selected={value?.from}
                  onSelect={(date) => date && onChange({ ...value, from: date })}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("analytics.toDate", "To")}
                </label>
                <CalendarComponent
                  mode="single"
                  selected={value?.to}
                  onSelect={(date) => date && onChange({ ...value, to: date })}
                  disabled={(date) => date > new Date() || date < value?.from}
                />
              </div>
            </div>
            <div className="flex justify-end mt-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={!value?.from || !value?.to}
              >
                {t("common.apply", "Apply")}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
