import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, Users, Calendar, DollarSign, Star, XCircle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface AnalyticsProps {
  salonId: string;
}

interface MonthlyStats {
  month: string;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  completionRate: string;
  cancellationRate: string;
  busiestDays: { date: string; count: number }[];
}

export function AnalyticsDashboard({ salonId }: AnalyticsProps) {
  const { t } = useTranslation();
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: stats, isLoading } = useQuery<MonthlyStats>({
    queryKey: ["/api/calendar/monthly-stats", { salonId, year, month }],
    queryFn: async () => {
      return apiRequest("GET", `/api/calendar/monthly-stats?salonId=${salonId}&year=${year}&month=${month}`);
    },
    enabled: !!salonId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  const metrics = [
    {
      title: t("analytics.totalBookings"),
      value: stats.totalBookings,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t("analytics.completedBookings"),
      value: stats.completedBookings,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("analytics.totalRevenue"),
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: t("analytics.completionRate"),
      value: `${stats.completionRate}%`,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold mt-2">{metric.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.bookingStatus")}</CardTitle>
          <CardDescription>{t("analytics.currentMonth")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{stats.confirmedBookings}</p>
              <p className="text-sm text-muted-foreground">{t("booking.confirmed")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50">
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</p>
              <p className="text-sm text-muted-foreground">{t("booking.pending")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{stats.completedBookings}</p>
              <p className="text-sm text-muted-foreground">{t("booking.completed")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{stats.cancelledBookings}</p>
              <p className="text-sm text-muted-foreground">{t("booking.cancelled")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Busiest Days Chart */}
      {stats.busiestDays && stats.busiestDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.busiestDays")}</CardTitle>
            <CardDescription>{t("analytics.topFiveDays")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.busiestDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Indicators */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              {t("analytics.completionRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{stats.completionRate}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.completedBookings} {t("analytics.outOf")} {stats.totalBookings} {t("analytics.bookings")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              {t("analytics.cancellationRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{stats.cancellationRate}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.cancelledBookings} {t("analytics.outOf")} {stats.totalBookings} {t("analytics.bookings")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
