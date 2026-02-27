import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { MasterStats } from "@/hooks/use-master-data";

interface MasterAnalyticsProps {
  stats: MasterStats | undefined;
  isLoading: boolean;
}

const PIE_COLORS = ["#fbbf24", "#3b82f6", "#22c55e", "#ef4444"];

export function MasterAnalytics({ stats, isLoading }: MasterAnalyticsProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const getLocalizedText = (
    obj: { en?: string; ru?: string; uz?: string } | null | undefined,
    lang: string,
  ) => {
    if (!obj) return "";
    return obj[lang as keyof typeof obj] || obj.en || "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-2">
            {t("marketplace.master.totalEarnings")}
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {stats.totalEarnings.toLocaleString()} UZS
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-2">
            {t("marketplace.master.clientRetention")}
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {(stats.clientRetention.retentionRate * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground">
            {stats.clientRetention.repeatClients} / {stats.clientRetention.totalClients}{" "}
            {t("marketplace.master.repeatClients")}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-4">
          {t("marketplace.master.earningsByMonth")}
        </h3>
        {stats.earningsByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.earningsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString()} UZS`,
                  t("marketplace.master.earnings"),
                ]}
              />
              <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noData")}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">
            {t("marketplace.master.popularServices")}
          </h3>
          {stats.popularServices.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.popularServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey={(entry) =>
                    getLocalizedText(entry.service?.name, currentLang) || entry.serviceId.slice(-6)
                  }
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("marketplace.master.noData")}
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">
            {t("marketplace.master.bookingsByStatus")}
          </h3>
          {stats.bookingsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.bookingsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) =>
                    `${t(`marketplace.master.status.${name}`)} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {stats.bookingsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, t(`marketplace.master.status.${name}`)]}
                />
                <Legend formatter={(value) => t(`marketplace.master.status.${value}`)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("marketplace.master.noData")}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
