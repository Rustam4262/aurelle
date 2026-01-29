import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  CalendarRange,
  TrendingUp,
  Wallet,
  Star,
  Scissors,
  Store,
  Calendar,
  PieChart,
} from "lucide-react";
import type { EnrichedBooking } from "./types";
import { useClientAnalytics } from "./useClientAnalytics";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
}

interface ClientAnalyticsProps {
  bookings: EnrichedBooking[] | undefined;
}

export function ClientAnalytics({ bookings }: ClientAnalyticsProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const analytics = useClientAnalytics({ bookings });

  const stats = {
    totalBookings: bookings?.length || 0,
    completedBookings: bookings?.filter((b) => b.status === "completed").length || 0,
    totalSpent:
      bookings
        ?.filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Month */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CalendarRange className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">
              {t("marketplace.client.analytics.thisMonth")}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.thisMonthSpent)}</p>
          <p className="text-xs text-muted-foreground">
            {analytics.thisMonthVisits} {t("marketplace.client.analytics.visits")}
          </p>
        </Card>

        {/* This Year */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">
              {t("marketplace.client.analytics.thisYear")}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.thisYearSpent)}</p>
          <p className="text-xs text-muted-foreground">
            {analytics.thisYearVisits} {t("marketplace.client.analytics.visits")}
          </p>
        </Card>

        {/* Average Check */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">
              {t("marketplace.client.analytics.averageCheck")}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.averageCheck)}</p>
        </Card>

        {/* All Time */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">
              {t("marketplace.client.analytics.allTime")}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
          <p className="text-xs text-muted-foreground">
            {stats.completedBookings} {t("marketplace.client.analytics.visits")}
          </p>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t("marketplace.client.analytics.monthlyExpenses")}
        </h3>
        {analytics.monthlyData.some((m) => m.amount > 0) ? (
          <div className="space-y-3">
            {analytics.monthlyData.map((month, index) => {
              const maxAmount = Math.max(...analytics.monthlyData.map((m) => m.amount));
              const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-muted-foreground">{month.month}</span>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      {month.amount > 0 && (
                        <span className="text-xs text-primary-foreground font-medium">
                          {month.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="w-32 text-sm font-medium text-right">
                    {formatCurrency(month.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t("marketplace.client.analytics.noData")}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Expensive Visit */}
        {analytics.mostExpensive && (
          <Card className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("marketplace.client.analytics.mostExpensive")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {getLocalizedText(analytics.mostExpensive.service?.name as any, currentLang)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {getLocalizedText(analytics.mostExpensive.salon?.name as any, currentLang)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(analytics.mostExpensive.bookingDate).toLocaleDateString(
                    currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                  )}
                </span>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatCurrency(analytics.mostExpensive.priceSnapshot || 0)}
              </p>
            </div>
          </Card>
        )}

        {/* Service Breakdown */}
        <Card className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {t("marketplace.client.analytics.serviceBreakdown")}
          </h3>
          {analytics.serviceStats.length > 0 ? (
            <div className="space-y-3">
              {analytics.serviceStats.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"][
                          index % 5
                        ],
                      }}
                    />
                    <span className="text-sm">{service.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {service.count}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(service.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("marketplace.client.analytics.noData")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
