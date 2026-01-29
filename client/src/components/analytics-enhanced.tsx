/**
 * Enhanced Analytics Dashboard Component
 *
 * Uses custom date range filtering and advanced analytics endpoints
 * Protected by ENHANCED_ANALYTICS feature flag
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, Clock, Users } from "lucide-react";
import { DateRangePicker, DateRange } from "./date-range-picker";
import { SalonSwitcher } from "./salon-switcher";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { subDays } from "date-fns";

interface Salon {
  id: string;
  name: string;
}

interface AnalyticsEnhancedProps {
  salons: Salon[];
}

export function AnalyticsEnhanced({ salons }: AnalyticsEnhancedProps) {
  const { t } = useTranslation();
  const isEnabled = useFeatureFlag("ENHANCED_ANALYTICS");

  // State
  const [selectedSalonId, setSelectedSalonId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch custom range analytics
  const {
    data: customRangeData,
    isLoading: isLoadingRange,
    refetch: refetchRange,
  } = useQuery({
    queryKey: ["/api/owner/analytics/custom-range", dateRange, selectedSalonId],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        salonId: selectedSalonId,
      });
      const response = await fetch(`/api/owner/analytics/custom-range?${params}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: isEnabled,
  });

  // Fetch comparison analytics
  const { data: comparisonData, isLoading: isLoadingComparison } = useQuery({
    queryKey: ["/api/owner/analytics/comparison", dateRange, selectedSalonId],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        salonId: selectedSalonId,
      });
      const response = await fetch(`/api/owner/analytics/comparison?${params}`);
      if (!response.ok) throw new Error("Failed to fetch comparison");
      return response.json();
    },
    enabled: isEnabled,
  });

  // Fetch master performance
  const { data: masterPerformance, isLoading: isLoadingMasters } = useQuery({
    queryKey: ["/api/owner/analytics/master-performance", dateRange, selectedSalonId],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        salonId: selectedSalonId,
      });
      const response = await fetch(`/api/owner/analytics/master-performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch master performance");
      return response.json();
    },
    enabled: isEnabled,
  });

  // Fetch service performance
  const { data: servicePerformance, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/owner/analytics/service-performance", dateRange, selectedSalonId],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        salonId: selectedSalonId,
      });
      const response = await fetch(`/api/owner/analytics/service-performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch service performance");
      return response.json();
    },
    enabled: isEnabled,
  });

  // Fetch peak hours
  const { data: peakHours, isLoading: isLoadingPeakHours } = useQuery({
    queryKey: ["/api/owner/analytics/peak-hours", dateRange, selectedSalonId],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        salonId: selectedSalonId,
      });
      const response = await fetch(`/api/owner/analytics/peak-hours?${params}`);
      if (!response.ok) throw new Error("Failed to fetch peak hours");
      return response.json();
    },
    enabled: isEnabled,
  });

  if (!isEnabled) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleRefresh = () => {
    refetchRange();
  };

  const isLoading = isLoadingRange || isLoadingComparison;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[280px]" />
          {salons.length > 1 && (
            <SalonSwitcher
              salons={salons}
              value={selectedSalonId}
              onChange={setSelectedSalonId}
              className="w-[200px]"
            />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("analytics.refreshData", "Refresh Data")}
        </Button>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.totalBookings", "Total Bookings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customRangeData?.totalBookings || 0}</div>
            {comparisonData && (
              <p className="text-xs text-muted-foreground flex items-center">
                {comparisonData.changes.bookings > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                {Math.abs(comparisonData.changes.bookings)}%{" "}
                {t("analytics.vsLastPeriod", "vs last period")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.totalRevenue", "Total Revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customRangeData?.totalRevenue || 0)}
            </div>
            {comparisonData && (
              <p className="text-xs text-muted-foreground flex items-center">
                {comparisonData.changes.revenue > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                {Math.abs(comparisonData.changes.revenue).toFixed(1)}%{" "}
                {t("analytics.vsLastPeriod", "vs last period")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.completionRate", "Completion Rate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customRangeData?.completionRate || 0}%</div>
            {comparisonData && (
              <p className="text-xs text-muted-foreground flex items-center">
                {comparisonData.changes.completionRate > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                {Math.abs(comparisonData.changes.completionRate).toFixed(1)}%{" "}
                {t("analytics.change", "change")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.avgBookingValue", "Avg. Booking")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customRangeData?.averageBookingValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("analytics.perCompletedBooking", "per completed booking")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="masters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="masters">
            <Users className="mr-2 h-4 w-4" />
            {t("analytics.masterPerformance", "Master Performance")}
          </TabsTrigger>
          <TabsTrigger value="services">
            {t("analytics.servicePerformance", "Service Performance")}
          </TabsTrigger>
          <TabsTrigger value="peak-hours">
            <Clock className="mr-2 h-4 w-4" />
            {t("analytics.peakHours", "Peak Hours")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="masters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.masterPerformance", "Master Performance")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMasters ? (
                <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
              ) : !masterPerformance || masterPerformance.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("analytics.noData", "No data available")}
                </p>
              ) : (
                <div className="space-y-4">
                  {masterPerformance.slice(0, 10).map((master: any) => (
                    <div
                      key={master.masterId}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{master.masterName}</p>
                        <p className="text-sm text-muted-foreground">
                          {master.totalBookings} {t("analytics.bookings", "bookings")} ·
                          {master.completionRate}% {t("analytics.completed", "completed")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(master.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.servicePerformance", "Service Performance")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
              ) : !servicePerformance || servicePerformance.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("analytics.noData", "No data available")}
                </p>
              ) : (
                <div className="space-y-4">
                  {servicePerformance.slice(0, 10).map((service: any) => (
                    <div
                      key={service.serviceId}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.totalBookings} {t("analytics.bookings", "bookings")} ·
                          {formatCurrency(service.price)} {t("analytics.basePrice", "base price")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(service.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peak-hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.peakHours", "Peak Hours")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPeakHours ? (
                <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
              ) : !peakHours || peakHours.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("analytics.noData", "No data available")}
                </p>
              ) : (
                <div className="space-y-2">
                  {peakHours.slice(0, 10).map((hour: any) => (
                    <div key={hour.hour} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">{hour.timeRange}</div>
                      <div className="flex-1">
                        <div className="h-8 bg-primary/10 rounded-md relative overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-md"
                            style={{
                              width: `${(hour.bookings / peakHours[0].bookings) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm font-medium">
                        {hour.bookings} {t("analytics.bookings", "bookings")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
