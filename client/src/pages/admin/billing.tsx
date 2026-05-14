import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgePercent,
  BarChart3,
  Coins,
  CreditCard,
  RefreshCw,
  Save,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type RangeKey = "7d" | "30d" | "90d" | "all";

interface FeeConfigResponse {
  global: {
    feePercent: number;
    description: string | null;
    updatedAt: string | null;
  };
  salonOverrides: Array<{
    salonId: string;
    feePercent: number;
    description: string | null;
    updatedAt: string | null;
  }>;
}

interface RevenueResponse {
  range: string;
  succeeded: {
    count: number;
    gmvUzs: number;
    platformFeeUzs: number;
    netUzs: number;
    avgFeePercent: number;
    takeRate: number;
  };
  pending: { count: number };
  failed: { count: number };
}

interface GmvResponse {
  range: string;
  from: string | null;
  to: string | null;
  daily: Array<{
    day: string;
    succeededCount: number;
    failedCount: number;
    pendingCount: number;
    gmvUzs: number;
    feeUzs: number;
    netUzs: number;
    takeRatePct: number;
  }>;
  totals: {
    succeededCount: number;
    failedCount: number;
    pendingCount: number;
    gmvUzs: number;
    feeUzs: number;
    netUzs: number;
    takeRatePct: number;
  } | null;
}

interface ReconciliationResponse {
  summary: {
    missingFeeCount: number;
    mathMismatchCount: number;
    orphanWebhookCount: number;
    hasIssues: boolean;
  };
  missingFee: Array<Record<string, unknown>>;
  mathMismatch: Array<Record<string, unknown>>;
  orphanWebhooks: Array<Record<string, unknown>>;
}

function formatUzs(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} UZS`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Не обновлялось";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Некорректная дата";
  return date.toLocaleString("ru-RU");
}

function NumberField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 дней",
  "30d": "30 дней",
  "90d": "90 дней",
  all: "За всё время",
};

export default function AdminBilling() {
  const { toast } = useToast();
  const [range, setRange] = useState<RangeKey>("30d");
  const [globalFeePercent, setGlobalFeePercent] = useState("");
  const [globalDescription, setGlobalDescription] = useState("");
  const [overrideSalonId, setOverrideSalonId] = useState("");
  const [overrideFeePercent, setOverrideFeePercent] = useState("");
  const [overrideDescription, setOverrideDescription] = useState("");

  const feeConfigQuery = useQuery<FeeConfigResponse>({
    queryKey: ["/api/admin/billing/fee-config"],
  });

  const revenueQuery = useQuery<RevenueResponse>({
    queryKey: ["/api/admin/billing/revenue", { range }],
  });

  const gmvQuery = useQuery<GmvResponse>({
    queryKey: ["/api/admin/billing/gmv", { range }],
  });

  const reconciliationQuery = useQuery<ReconciliationResponse>({
    queryKey: ["/api/admin/billing/reconciliation"],
  });

  const isRefreshing =
    feeConfigQuery.isFetching ||
    revenueQuery.isFetching ||
    gmvQuery.isFetching ||
    reconciliationQuery.isFetching;

  const refreshAll = async () => {
    await Promise.all([
      feeConfigQuery.refetch(),
      revenueQuery.refetch(),
      gmvQuery.refetch(),
      reconciliationQuery.refetch(),
    ]);
  };

  const setGlobalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/billing/fee-config", {
        feePercent: Number(globalFeePercent),
        description: globalDescription.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setGlobalFeePercent("");
      setGlobalDescription("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/fee-config"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/revenue"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/gmv"] });
      toast({ title: "Глобальная комиссия обновлена" });
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось обновить глобальную комиссию",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setOverrideMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/admin/billing/fee-config/salon/${overrideSalonId.trim()}`, {
        feePercent: Number(overrideFeePercent),
        description: overrideDescription.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setOverrideSalonId("");
      setOverrideFeePercent("");
      setOverrideDescription("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/fee-config"] });
      toast({ title: "Переопределение комиссии сохранено" });
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось сохранить переопределение",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: async (salonId: string) =>
      apiRequest("DELETE", `/api/admin/billing/fee-config/salon/${salonId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/fee-config"] });
      toast({ title: "Переопределение удалено" });
    },
    onError: (error: Error) => {
      toast({
        title: "Не удалось удалить переопределение",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const summaryCards = useMemo(() => {
    const data = revenueQuery.data?.succeeded;
    if (!data) return [];

    return [
      {
        title: "GMV",
        value: formatUzs(data.gmvUzs),
        subtitle: `${data.count} успешных платежей`,
        icon: Wallet,
        tone: "text-emerald-600 bg-emerald-500/10",
      },
      {
        title: "Комиссия платформы",
        value: formatUzs(data.platformFeeUzs),
        subtitle: `Take rate ${data.takeRate}%`,
        icon: Coins,
        tone: "text-orange-600 bg-orange-500/10",
      },
      {
        title: "Net для салонов",
        value: formatUzs(data.netUzs),
        subtitle: `Средняя комиссия ${data.avgFeePercent}%`,
        icon: TrendingUp,
        tone: "text-blue-600 bg-blue-500/10",
      },
      {
        title: "Риск-очередь",
        value: `${revenueQuery.data?.pending.count ?? 0} / ${revenueQuery.data?.failed.count ?? 0}`,
        subtitle: "Pending / Failed",
        icon: CreditCard,
        tone: "text-rose-600 bg-rose-500/10",
      },
    ];
  }, [revenueQuery.data]);

  const globalConfig = feeConfigQuery.data?.global;
  const gmvRows = gmvQuery.data?.daily ?? [];
  const reconciliation = reconciliationQuery.data;
  const financeSignals = [
    {
      id: "take-rate",
      label: "Take rate",
      value: revenueQuery.data ? `${revenueQuery.data.succeeded.takeRate}%` : "0%",
      helper: "Средняя доля платформы в успешных платежах",
    },
    {
      id: "pending",
      label: "Ожидающие платежи",
      value: `${revenueQuery.data?.pending.count ?? 0}`,
      helper: "Платежи, которые ещё не дошли до финального статуса",
    },
    {
      id: "reconciliation",
      label: "Reconciliation",
      value: reconciliation?.summary.hasIssues ? "Есть риски" : "Стабильно",
      helper: reconciliation?.summary.hasIssues
        ? "Есть сигналы, требующие разбора"
        : "Критичных расхождений пока не видно",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/70 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-full px-3 py-1">Финансовый контур</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">Период: {RANGE_LABELS[range]}</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-serif font-semibold">Финансы и биллинг</h1>
                <p className="mt-2 text-muted-foreground">
                  Контроль GMV, комиссии платформы, индивидуальных ставок и финансовых несоответствий.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["7d", "30d", "90d", "all"] as RangeKey[]).map((item) => (
                <Button
                  key={item}
                  variant={range === item ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRange(item)}
                >
                  {RANGE_LABELS[item]}
                </Button>
              ))}
              <Button variant="outline" onClick={refreshAll} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Обновить
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {financeSignals.map((signal) => (
              <div key={signal.id} className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {signal.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{signal.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{signal.helper}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="hidden flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Финансы и биллинг</h1>
          <p className="mt-2 text-muted-foreground">
            Контроль GMV, комиссии платформы, индивидуальных ставок и финансовых
            несоответствий.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["7d", "30d", "90d", "all"] as RangeKey[]).map((item) => (
            <Button
              key={item}
              variant={range === item ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(item)}
            >
              {item}
            </Button>
          ))}
          <Button variant="outline" onClick={refreshAll} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.length > 0
          ? summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`rounded-md p-2 ${card.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })
          : [...Array(4)].map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              GMV по дням
            </CardTitle>
            <CardDescription>
              Ежедневная динамика успешных, ожидающих и неуспешных платежей за выбранный
              период.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gmvQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : gmvRows.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                В выбранном диапазоне пока нет агрегированных данных GMV.
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>День</TableHead>
                      <TableHead>GMV</TableHead>
                      <TableHead>Комиссия</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Take rate</TableHead>
                      <TableHead>Платежи</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gmvRows.slice(-10).reverse().map((row) => (
                      <TableRow key={row.day}>
                        <TableCell>{formatDate(row.day)}</TableCell>
                        <TableCell className="font-medium">{formatUzs(row.gmvUzs)}</TableCell>
                        <TableCell>{formatUzs(row.feeUzs)}</TableCell>
                        <TableCell>{formatUzs(row.netUzs)}</TableCell>
                        <TableCell>{row.takeRatePct}%</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary">OK {row.succeededCount}</Badge>
                            <Badge variant="outline">Pending {row.pendingCount}</Badge>
                            <Badge variant="destructive">Fail {row.failedCount}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-muted-foreground" />
                Глобальная комиссия
              </CardTitle>
              <CardDescription>
                Базовая ставка платформы, которая применяется по умолчанию.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Текущая ставка</p>
                    <p className="mt-1 text-3xl font-bold">
                      {globalConfig ? `${globalConfig.feePercent}%` : "0%"}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatDate(globalConfig?.updatedAt)}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {globalConfig?.description || "Описание пока не задано."}
                </p>
              </div>

              <div className="space-y-3">
                <NumberField
                  value={globalFeePercent}
                  onChange={setGlobalFeePercent}
                  placeholder="Например, 12.5"
                />
                <Textarea
                  value={globalDescription}
                  onChange={(event) => setGlobalDescription(event.target.value)}
                  placeholder="Коротко поясните, почему меняется глобальная комиссия"
                  rows={3}
                />
                <Button
                  onClick={() => setGlobalMutation.mutate()}
                  disabled={!globalFeePercent || setGlobalMutation.isPending}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить глобальную ставку
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Переопределение для салона</CardTitle>
              <CardDescription>
                Точечная настройка комиссии для конкретного салона по его `salonId`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={overrideSalonId}
                onChange={(event) => setOverrideSalonId(event.target.value)}
                placeholder="salonId"
              />
              <NumberField
                value={overrideFeePercent}
                onChange={setOverrideFeePercent}
                placeholder="Например, 9"
              />
              <Textarea
                value={overrideDescription}
                onChange={(event) => setOverrideDescription(event.target.value)}
                placeholder="Комментарий к переопределению"
                rows={3}
              />
              <Button
                onClick={() => setOverrideMutation.mutate()}
                disabled={!overrideSalonId || !overrideFeePercent || setOverrideMutation.isPending}
                className="w-full"
              >
                Сохранить переопределение
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            Активные переопределения комиссии
          </CardTitle>
          <CardDescription>
            Актуальные индивидуальные ставки на уровне конкретных салонов.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feeConfigQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !feeConfigQuery.data || feeConfigQuery.data.salonOverrides.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Пока нет ни одного активного переопределения.
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salon ID</TableHead>
                    <TableHead>Комиссия</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Обновлено</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeConfigQuery.data.salonOverrides.map((override) => (
                    <TableRow key={override.salonId}>
                      <TableCell className="font-mono text-xs">{override.salonId}</TableCell>
                      <TableCell className="font-medium">{override.feePercent}%</TableCell>
                      <TableCell className="max-w-[420px] text-sm text-muted-foreground">
                        {override.description || "Без комментария"}
                      </TableCell>
                      <TableCell>{formatDate(override.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOverrideMutation.mutate(override.salonId)}
                          disabled={removeOverrideMutation.isPending}
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Reconciliation и финансовые риски
          </CardTitle>
          <CardDescription>
            Быстрый контроль отсутствующих snapshots комиссии, математических расхождений
            и orphan webhook events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reconciliationQuery.isLoading || !reconciliation ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className={reconciliation.summary.missingFeeCount > 0 ? "border-orange-500/40" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Без snapshot комиссии</CardDescription>
                    <CardTitle className="text-3xl">{reconciliation.summary.missingFeeCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={reconciliation.summary.mathMismatchCount > 0 ? "border-rose-500/40" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Расхождения в расчётах</CardDescription>
                    <CardTitle className="text-3xl">{reconciliation.summary.mathMismatchCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={reconciliation.summary.orphanWebhookCount > 0 ? "border-red-500/40" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Webhook без платежа</CardDescription>
                    <CardTitle className="text-3xl">{reconciliation.summary.orphanWebhookCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  reconciliation.summary.hasIssues
                    ? "border-orange-500/40 bg-orange-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`mt-0.5 h-5 w-5 ${
                      reconciliation.summary.hasIssues ? "text-orange-600" : "text-emerald-600"
                    }`}
                  />
                  <div>
                    <p className="font-medium">
                      {reconciliation.summary.hasIssues
                        ? "Есть финансовые несоответствия, которые стоит разобрать."
                        : "Критичных расхождений в биллинге сейчас не видно."}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Этот блок помогает быстро оценить, насколько платежные данные
                      консистентны на уровне платформы.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
