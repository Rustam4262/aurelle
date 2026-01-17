import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TrendingUp, Calendar } from "lucide-react";

interface TrendData {
  date: string;
  revenue: number;
  bookings: number;
}

interface DashboardChartsProps {
  trends: TrendData[];
  topServices: Array<{ id: string; name: any; count: number }>;
  topMasters: Array<{ id: string; name: string; revenue: number }>;
}

export function DashboardCharts({ trends, topServices, topMasters }: DashboardChartsProps) {
  const { t, i18n } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Map language codes to valid Intl locale identifiers
    const locale = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateFormat(locale, {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Prepare top services data with localized names
  const servicesChartData = topServices.map(service => ({
    name: service.name?.[i18n.language as 'en' | 'ru' | 'uz'] || service.name?.en || 'Unknown',
    count: service.count
  }));

  // Prepare top masters data
  const mastersChartData = topMasters.map(master => ({
    name: master.name,
    revenue: master.revenue
  }));

  return (
    <div className="space-y-6">
      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('dashboard.revenueTrend', 'Revenue Trend (Last 30 Days)')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                className="text-xs"
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), t('dashboard.revenue', 'Revenue')]}
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bookings Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('dashboard.bookingsTrend', 'Bookings Trend (Last 30 Days)')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => [value, t('dashboard.bookings', 'Bookings')]}
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Services Bar Chart */}
      {servicesChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topServicesChart', 'Top Services by Bookings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicesChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [value, t('dashboard.bookings', 'Bookings')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Masters Bar Chart */}
      {mastersChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topMastersChart', 'Top Masters by Revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mastersChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  className="text-xs"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), t('dashboard.revenue', 'Revenue')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--chart-3))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
