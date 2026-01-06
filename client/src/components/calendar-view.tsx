import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { CalendarDays, TrendingUp, Users, Clock } from "lucide-react";

interface CalendarViewProps {
  salonId?: string;
  masterId?: string;
}

interface DayData {
  date: string;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  bookings: any[];
}

interface DayBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  masterName: string;
  serviceName: string;
}

export function CalendarView({ salonId, masterId }: CalendarViewProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Get calendar data for current month
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: calendarData, isLoading: isLoadingCalendar } = useQuery<DayData[]>({
    queryKey: ["/api/calendar/availability", { salonId, masterId, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (salonId) params.append("salonId", salonId);
      if (masterId) params.append("masterId", masterId);
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      return apiRequest("GET", `/api/calendar/availability?${params}`);
    },
    enabled: !!(salonId || masterId),
  });

  // Get detailed schedule for selected day
  const { data: daySchedule, isLoading: isLoadingSchedule } = useQuery<DayBooking[]>({
    queryKey: ["/api/calendar/day-schedule", { salonId, masterId, date: format(selectedDate, "yyyy-MM-dd") }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (salonId) params.append("salonId", salonId);
      if (masterId) params.append("masterId", masterId);
      params.append("date", format(selectedDate, "yyyy-MM-dd"));
      return apiRequest("GET", `/api/calendar/day-schedule?${params}`);
    },
    enabled: !!(salonId || masterId),
  });

  // Find data for a specific date
  const getDateData = (date: Date): DayData | undefined => {
    if (!calendarData) return undefined;
    const dateStr = format(date, "yyyy-MM-dd");
    return calendarData.find(d => d.date === dateStr);
  };

  // Custom day content with booking indicators
  const modifiers = {
    hasBookings: (date: Date) => {
      const data = getDateData(date);
      return !!data && data.totalBookings > 0;
    },
    busy: (date: Date) => {
      const data = getDateData(date);
      return !!data && data.totalBookings >= 5;
    },
    selected: (date: Date) => isSameDay(date, selectedDate),
  };

  const modifiersStyles = {
    hasBookings: {
      backgroundColor: "rgba(var(--primary), 0.1)",
      fontWeight: "600",
    },
    busy: {
      backgroundColor: "rgba(var(--primary), 0.3)",
      color: "white",
    },
  };

  const selectedDayData = getDateData(selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return t("booking.confirmed");
      case "pending":
        return t("booking.pending");
      case "cancelled":
        return t("booking.cancelled");
      case "completed":
        return t("booking.completed");
      default:
        return status;
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("calendar.title")}
          </CardTitle>
          <CardDescription>{t("calendar.selectDate")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />

          {/* Legend */}
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">{t("calendar.legend")}:</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary/10"></div>
                <span>{t("calendar.hasBookings")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary/30"></div>
                <span>{t("calendar.busy")} (5+)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("calendar.scheduleFor")} {format(selectedDate, "MMM d, yyyy")}
          </CardTitle>
          {selectedDayData && (
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                {t("calendar.totalBookings")}: {selectedDayData.totalBookings}
              </Badge>
              <Badge variant="secondary">
                {t("booking.confirmed")}: {selectedDayData.confirmedBookings}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingSchedule ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : !daySchedule || daySchedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("calendar.noBookings")}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {daySchedule.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.serviceName}
                      </p>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusText(booking.status)}
                    </Badge>
                  </div>

                  {booking.masterName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{booking.masterName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {selectedDayData && selectedDayData.totalBookings > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("calendar.statistics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{selectedDayData.totalBookings}</p>
                <p className="text-sm text-muted-foreground">{t("calendar.total")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{selectedDayData.confirmedBookings}</p>
                <p className="text-sm text-muted-foreground">{t("booking.confirmed")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50">
                <p className="text-2xl font-bold text-yellow-600">{selectedDayData.pendingBookings}</p>
                <p className="text-sm text-muted-foreground">{t("booking.pending")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">{selectedDayData.completedBookings}</p>
                <p className="text-sm text-muted-foreground">{t("booking.completed")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-600">{selectedDayData.cancelledBookings}</p>
                <p className="text-sm text-muted-foreground">{t("booking.cancelled")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
