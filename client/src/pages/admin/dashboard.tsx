import { useQuery } from "@tanstack/react-query";
import { PaymentHealthWidget } from "@/components/payment-health-widget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Store,
  Calendar,
  AlertCircle,
  Shield,
  TrendingUp,
  Activity,
  UserCheck,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";

interface DashboardStats {
  stats: {
    users: {
      total: number;
      newLastWeek: number;
    };
    salons: {
      total: number;
      verified: number;
    };
    masters: {
      total: number;
    };
    bookings: {
      total: number;
    };
    moderation: {
      openComplaints: number;
      activeSanctions: number;
    };
  };
}

interface OnlineUsersResponse {
  onlineUsers: number;
}

interface UserGrowthResponse {
  growth: Array<{
    date: string;
    count: number;
  }>;
}

interface PlatformHealthResponse {
  health: {
    blockedUserPercentage: number;
    activeSessionsLast24h: number;
    avgSessionDurationMinutes: number;
    pendingComplaints: number;
    emailVerificationRate: number;
    phoneVerificationRate: number;
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [refreshInterval] = useState(30000); // 30 seconds

  // Main stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  // Online users with auto-refresh
  const { data: onlineData } = useQuery<OnlineUsersResponse>({
    queryKey: ["/api/admin/dashboard/online"],
    refetchInterval: refreshInterval,
  });

  // User growth chart
  const { data: userGrowth } = useQuery<UserGrowthResponse>({
    queryKey: ["/api/admin/dashboard/user-growth", { days: 30 }],
  });

  // Platform health metrics
  const { data: platformHealth } = useQuery<PlatformHealthResponse>({
    queryKey: ["/api/admin/dashboard/platform-health"],
    refetchInterval: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-semibold">
          {t("marketplace.admin.dashboard.title")}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t("marketplace.admin.dashboard.totalUsers"),
      value: stats?.stats.users.total || 0,
      subtitle: t("marketplace.admin.dashboard.newThisWeek", {
        count: stats?.stats.users.newLastWeek || 0,
      }),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: t("marketplace.admin.dashboard.salons"),
      value: stats?.stats.salons.total || 0,
      subtitle: t("marketplace.admin.dashboard.verified", {
        count: stats?.stats.salons.verified || 0,
      }),
      icon: Store,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: t("marketplace.admin.dashboard.masters"),
      value: stats?.stats.masters.total || 0,
      subtitle: t("marketplace.admin.dashboard.activeMasters"),
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: t("marketplace.admin.dashboard.totalBookings"),
      value: stats?.stats.bookings.total || 0,
      subtitle: t("marketplace.admin.dashboard.allTime"),
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: t("marketplace.admin.dashboard.openComplaints"),
      value: stats?.stats.moderation.openComplaints || 0,
      subtitle: t("marketplace.admin.dashboard.requireAttention"),
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: t("marketplace.admin.dashboard.activeSanctions"),
      value: stats?.stats.moderation.activeSanctions || 0,
      subtitle: t("marketplace.admin.dashboard.currentlyEnforced"),
      icon: Shield,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">
          {t("marketplace.admin.dashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("marketplace.admin.dashboard.subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {card.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Online Users - Real-time */}
      <Card className="border-2 border-green-200 dark:border-green-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600 animate-pulse" />
            {t("admin.dashboard.onlineUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {onlineData?.onlineUsers?.toLocaleString() || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("admin.dashboard.onlineSubtitle")}
          </p>
        </CardContent>
      </Card>

      {/* User Growth Chart */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("admin.dashboard.userGrowthTitle")}</CardTitle>
          <CardDescription>{t("admin.dashboard.userGrowthSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {userGrowth && userGrowth.growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowth.growth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [value, t("admin.dashboard.newUsersLabel")]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {t("admin.dashboard.noGrowthData")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Health */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.dashboard.paymentHealth")}</CardTitle>
          <CardDescription>{t("admin.dashboard.paymentHealthSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentHealthWidget scope="platform" />
        </CardContent>
      </Card>

      {/* Platform Health Metrics */}
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("admin.dashboard.platformHealth")}
          </CardTitle>
          <CardDescription>{t("admin.dashboard.platformHealthSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {platformHealth ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin.dashboard.metrics.activeSessions")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.activeSessDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {platformHealth.health.activeSessionsLast24h}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">{t("admin.dashboard.metrics.avgSession")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.avgSessDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {platformHealth.health.avgSessionDurationMinutes}m
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin.dashboard.metrics.emailVerified")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.emailVerifDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {Math.round(platformHealth.health.emailVerificationRate)}%
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin.dashboard.metrics.phoneVerified")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.phoneVerifDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-teal-600">
                  {Math.round(platformHealth.health.phoneVerificationRate)}%
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin.dashboard.metrics.pendingComplaints")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.pendingComplDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {platformHealth.health.pendingComplaints}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin.dashboard.metrics.blockedUsers")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.dashboard.metrics.blockedUsersDesc")}
                    </p>
                  </div>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {platformHealth.health.blockedUserPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
