import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useWebSocket } from "@/hooks/use-websocket";

// ─── Types ────────────────────────────────────────────────────────────────────

type Window = "24h" | "7d" | "30d";

interface HealthData {
  windowHours: number;
  counts: { succeeded: number; failed: number; pending: number; cancelled: number };
  gross: number;
  successRate: number;
  webhookErrors: number;
  byProvider: Record<string, { succeeded: number; failed: number; pending: number; gross: number }>;
  topErrors: Array<{ message: string; count: number }>;
  enabled: boolean;
  salonIds: string[] | null;
}

interface TimeseriesPoint {
  bucket: string;
  succeeded: number;
  failed: number;
  pending: number;
  gross: number;
}

interface TimeseriesData {
  timeseries: TimeseriesPoint[];
  bucket: "hour" | "day";
  windowHours: number;
}

interface RecentPayment {
  id: string;
  orderId: string;
  provider: string;
  status: string;
  amountUzs: number;
  type: string;
  errorMessage: string | null;
  createdAt: string;
  bookingId: string;
}

interface RecentData {
  payments: RecentPayment[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentHealthWidgetProps {
  scope: "platform" | "salon" | "master" | "client";
  salonId?: string;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUzs(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusBadge(status: string) {
  const variants: Record<string, { label: string; className: string }> = {
    succeeded: { label: "Оплачен", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    failed: { label: "Ошибка", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    pending: { label: "Ожидает", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
    cancelled: { label: "Отменён", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  };
  const v = variants[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function formatBucket(bucket: string, bucketType: "hour" | "day"): string {
  try {
    const d = parseISO(bucket);
    return bucketType === "hour" ? format(d, "HH:mm", { locale: ru }) : format(d, "d MMM", { locale: ru });
  } catch {
    return bucket;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentHealthWidget({ scope, salonId, className }: PaymentHealthWidgetProps) {
  const [win, setWin] = useState<Window>("24h");
  const { on, off } = useWebSocket();

  const qs = salonId ? `&salonId=${salonId}` : "";

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<HealthData>({
    queryKey: ["/api/payments/health", win, salonId],
    queryFn: () =>
      apiRequest("GET", `/api/payments/health?window=${win}${qs}`).then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: series, refetch: refetchSeries } = useQuery<TimeseriesData>({
    queryKey: ["/api/payments/health/timeseries", win, salonId],
    queryFn: () =>
      apiRequest("GET", `/api/payments/health/timeseries?window=${win}${qs}`).then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: recent, refetch: refetchRecent } = useQuery<RecentData>({
    queryKey: ["/api/payments/health/recent", salonId],
    queryFn: () =>
      apiRequest("GET", `/api/payments/health/recent?limit=20${qs}`).then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Real-time: refresh on payment_status_changed WS event
  useEffect(() => {
    const handler = () => {
      void refetch();
      void refetchSeries();
      void refetchRecent();
    };
    on("payment_status_changed", handler);
    return () => off("payment_status_changed", handler);
  }, [on, off, refetch, refetchSeries, refetchRecent]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>Не удалось загрузить данные платежей</AlertDescription>
      </Alert>
    );
  }

  // ── Payments disabled ─────────────────────────────────────────────────────
  if (data && !data.enabled) {
    return (
      <div className={`rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center ${className ?? ""}`}>
        <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Платёжный провайдер не настроен</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Задайте PAYMENT_PROVIDER в .env для включения приёма платежей
        </p>
      </div>
    );
  }

  const c = data?.counts ?? { succeeded: 0, failed: 0, pending: 0, cancelled: 0 };
  const bucketType = series?.bucket ?? (win === "24h" ? "hour" : "day");

  const chartData = (series?.timeseries ?? []).map((p) => ({
    ...p,
    label: formatBucket(p.bucket, bucketType),
  }));

  const statCards = [
    {
      label: "Успешно",
      value: c.succeeded,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Ошибок",
      value: c.failed,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      label: "Ожидает",
      value: c.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      label: "Webhook ошибок",
      value: data?.webhookErrors ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Header + window toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Платежи</h3>
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "30d"] as Window[]).map((w) => (
            <Button
              key={w}
              variant={win === w ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setWin(w)}
            >
              {w}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <div className={`rounded-full p-1 ${card.bg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Выручка</span>
            </div>
            <div className="text-xl font-bold">{formatUzs(data?.gross ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Успешность</span>
            </div>
            <div className="text-xl font-bold">
              {((data?.successRate ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeseries chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Динамика платежей</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="succeeded"
                  name="Успешно"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="Ошибок"
                  stackId="2"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name="Ожидает"
                  stackId="3"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent payments table */}
      {(recent?.payments?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Последние платежи</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Статус</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Провайдер</th>
                    <th className="px-4 py-2 text-right text-muted-foreground font-medium">Сумма</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Дата</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent?.payments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2">{statusBadge(p.status)}</td>
                      <td className="px-4 py-2 capitalize text-muted-foreground">{p.provider}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatUzs(p.amountUzs)}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.createdAt
                          ? format(parseISO(p.createdAt), "d MMM HH:mm", { locale: ru })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-red-500 max-w-[180px] truncate">
                        {p.errorMessage ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!isLoading && !error && data?.enabled && (c.succeeded + c.failed + c.pending) === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">Платежей за выбранный период нет</p>
        </div>
      )}
    </div>
  );
}
