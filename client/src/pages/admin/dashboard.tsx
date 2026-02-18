import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, Calendar, AlertCircle, Shield, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

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

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-semibold">{t("marketplace.admin.dashboard.title")}</h1>
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
      subtitle: t("marketplace.admin.dashboard.newThisWeek", { count: stats?.stats.users.newLastWeek || 0 }),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: t("marketplace.admin.dashboard.salons"),
      value: stats?.stats.salons.total || 0,
      subtitle: t("marketplace.admin.dashboard.verified", { count: stats?.stats.salons.verified || 0 }),
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
        <h1 className="text-3xl font-serif font-semibold text-foreground">{t("marketplace.admin.dashboard.title")}</h1>
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

      {/* Platform Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("marketplace.admin.dashboard.platformHealth")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("marketplace.admin.dashboard.userVerificationRate")}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.admin.dashboard.emailPhoneVerified")}</p>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats?.stats.salons.total
                  ? Math.round((stats.stats.salons.verified / stats.stats.salons.total) * 100)
                  : 0}
                %
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("marketplace.admin.dashboard.complaintResolution")}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.admin.dashboard.openComplaintsRequiringAttention")}</p>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.stats.moderation.openComplaints || 0}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("marketplace.admin.dashboard.activeEnforcement")}</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.admin.dashboard.currentSanctionsInEffect")}</p>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats?.stats.moderation.activeSanctions || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
