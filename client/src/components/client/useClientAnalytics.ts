import { useMemo } from "react";
import type { EnrichedBooking } from "./types";
import { useTranslation } from "react-i18next";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface ClientAnalyticsProps {
  bookings: EnrichedBooking[] | undefined;
}

export function useClientAnalytics({ bookings }: ClientAnalyticsProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const analytics = useMemo(() => {
    const completedBookings = bookings?.filter((b) => b.status === "completed") || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // This month spending
    const thisMonthBookings = completedBookings.filter((b) => {
      const date = new Date(b.bookingDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const thisMonthSpent = thisMonthBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);

    // This year spending
    const thisYearBookings = completedBookings.filter((b) => {
      const date = new Date(b.bookingDate);
      return date.getFullYear() === currentYear;
    });
    const thisYearSpent = thisYearBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);

    // Average check
    const averageCheck =
      completedBookings.length > 0
        ? Math.round(
            completedBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) /
              completedBookings.length,
          )
        : 0;

    // Most expensive visit
    const mostExpensive =
      completedBookings.length > 0
        ? completedBookings.reduce(
            (max, b) => ((b.priceSnapshot || 0) > (max.priceSnapshot || 0) ? b : max),
            completedBookings[0],
          )
        : null;

    // Monthly breakdown for chart (last 6 months)
    const monthlyData: { month: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthBookings = completedBookings.filter((b) => {
        const bDate = new Date(b.bookingDate);
        return bDate.getMonth() === date.getMonth() && bDate.getFullYear() === date.getFullYear();
      });
      const monthNames =
        currentLang === "ru"
          ? ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
          : currentLang === "uz"
            ? ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"]
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthlyData.push({
        month: monthNames[date.getMonth()],
        amount: monthBookings.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0),
        count: monthBookings.length,
      });
    }

    // Service breakdown
    const serviceStats: { name: string; count: number; amount: number }[] = [];
    completedBookings.forEach((b) => {
      const serviceName = getLocalizedText(b.service?.name as any, currentLang) || "Unknown";
      const existing = serviceStats.find((s) => s.name === serviceName);
      if (existing) {
        existing.count++;
        existing.amount += b.priceSnapshot || 0;
      } else {
        serviceStats.push({ name: serviceName, count: 1, amount: b.priceSnapshot || 0 });
      }
    });
    serviceStats.sort((a, b) => b.amount - a.amount);

    return {
      thisMonthSpent,
      thisMonthVisits: thisMonthBookings.length,
      thisYearSpent,
      thisYearVisits: thisYearBookings.length,
      averageCheck,
      mostExpensive,
      monthlyData,
      serviceStats: serviceStats.slice(0, 5), // Top 5 services
    };
  }, [bookings, currentLang]);

  return analytics;
}
