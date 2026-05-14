import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PaymentHealthWidget } from "@/components/payment-health-widget";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  CreditCard,
  Flame,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wifi,
} from "lucide-react";

interface DashboardStats {
  range: string;
  stats: {
    users: { total: number; newLastWeek: number; newInPeriod: number; prevPeriod: number };
    salons: { total: number; verified: number; newInPeriod: number };
    masters: { total: number; newInPeriod: number };
    bookings: { total: number; newInPeriod: number; prevPeriod: number };
    moderation: { openComplaints: number; activeSanctions: number };
  };
}

interface ActionCenterData {
  unverifiedSalons: number;
  pendingComplaints: number;
  paymentErrors24h: number;
  expiringToday: number;
}

interface OnlineUsersResponse {
  onlineUsers: number;
}

interface UserGrowthResponse {
  growth: Array<{ date: string; count: number }>;
  series: string;
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

interface FunnelResponse {
  signups: number;
  bookingsCreated: number;
  bookingsCompleted: number;
}

type RangeKey = "24h" | "7d" | "30d" | "90d";
type SeriesKey = "users" | "salons" | "bookings";

const QUERY_OPTS = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } as const;
const RANGES: RangeKey[] = ["24h", "7d", "30d", "90d"];
const RANGE_LABELS: Record<RangeKey, string> = { "24h": "24ч", "7d": "7д", "30d": "30д", "90d": "90д" };
const SERIES: SeriesKey[] = ["users", "salons", "bookings"];
const SERIES_LABELS: Record<SeriesKey, string> = { users: "Пользователи", salons: "Салоны", bookings: "Записи" };
const SERIES_COLORS: Record<SeriesKey, string> = { users: "#3b82f6", salons: "#8b5cf6", bookings: "#10b981" };

const num = (value: number) => value.toLocaleString("ru-RU");

function HeroMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/80 px-4 py-4 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${tone ?? "text-foreground"}`}>{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  meta,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: string;
  meta: string;
  icon: React.ElementType;
  iconTone: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{meta}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ListItem({
  title,
  description,
  count,
  href,
  cta,
  badgeClass,
}: {
  title: string;
  description: string;
  count: number;
  href: string;
  cta: string;
  badgeClass: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <Badge className={badgeClass}>{count}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link href={href}>
        <Button variant="outline" className="gap-2">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function FeedRow({
  icon: Icon,
  tone,
  title,
  description,
}: {
  icon: React.ElementType;
  tone: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background px-4 py-4">
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FunnelRow({ label, value, max, barColor }: { label: string; value: number; max: number; barColor: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)_60px_48px] sm:items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-sm font-semibold tabular-nums">{num(value)}</span>
      <span className="text-right text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">
        {new Date(label).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
      </p>
      <p className="mt-1 text-sm font-semibold">{payload[0].value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [series, setSeries] = useState<SeriesKey>("users");

  const { data: stats, isLoading, isError, refetch: refetchStats, isFetching } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard", { range }],
    ...QUERY_OPTS,
  });
  const { data: todayStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard", { range: "24h" }],
    ...QUERY_OPTS,
  });
  const { data: actionCenter } = useQuery<ActionCenterData>({
    queryKey: ["/api/admin/dashboard/action-center"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: onlineData, refetch: refetchOnline } = useQuery<OnlineUsersResponse>({
    queryKey: ["/api/admin/dashboard/online"],
    refetchInterval: 60_000,
    ...QUERY_OPTS,
  });
  const { data: growthData } = useQuery<UserGrowthResponse>({
    queryKey: ["/api/admin/dashboard/user-growth", { range, series }],
    ...QUERY_OPTS,
  });
  const { data: funnelData } = useQuery<FunnelResponse>({
    queryKey: ["/api/admin/dashboard/funnel", { range }],
    ...QUERY_OPTS,
  });
  const { data: platformHealth } = useQuery<PlatformHealthResponse>({
    queryKey: ["/api/admin/dashboard/platform-health"],
    refetchInterval: 120_000,
    ...QUERY_OPTS,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Не удалось загрузить dashboard</AlertTitle>
        <AlertDescription>Попробуй обновить страницу. Если проблема повторится, уже копаем запросы.</AlertDescription>
      </Alert>
    );
  }

  const refreshAll = () => {
    void refetchStats();
    void refetchOnline();
  };

  const s = stats.stats;
  const today = todayStats?.stats;
  const ac = actionCenter;
  const health = platformHealth?.health;
  const online = onlineData?.onlineUsers ?? 0;
  const seriesColor = SERIES_COLORS[series];
  const conversion = funnelData && funnelData.signups > 0 ? ((funnelData.bookingsCreated / funnelData.signups) * 100).toFixed(1) : "0.0";

  const queue = [
    {
      title: "Жалобы ждут решения",
      description: "Сначала разгрузи модерацию, чтобы негатив не копился в тени.",
      count: ac?.pendingComplaints ?? 0,
      href: "/admin/complaints",
      cta: "Открыть жалобы",
      badgeClass: "bg-red-500/10 text-red-600 border border-red-500/20",
    },
    {
      title: "Салоны ждут проверки",
      description: "Непроверенные карточки тормозят качество каталога и доверие пользователей.",
      count: ac?.unverifiedSalons ?? 0,
      href: "/admin/salons",
      cta: "Проверить салоны",
      badgeClass: "bg-orange-500/10 text-orange-600 border border-orange-500/20",
    },
    {
      title: "Санкции истекают сегодня",
      description: "Ограничения не должны заканчиваться незаметно. Здесь всё, что пора пересмотреть.",
      count: ac?.expiringToday ?? 0,
      href: "/admin/sanctions",
      cta: "Открыть санкции",
      badgeClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    {
      title: "Ошибки платежей за 24ч",
      description: "Финансовые сбои должны быть рядом с операционной очередью, а не глубоко внизу страницы.",
      count: ac?.paymentErrors24h ?? 0,
      href: "/admin/dashboard",
      cta: "Смотреть платежи",
      badgeClass: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
    },
  ];

  const feed = [
    {
      icon: Users,
      tone: "bg-blue-500/10 text-blue-600",
      title: `${num(today?.users.newInPeriod ?? 0)} новых пользователей за 24 часа`,
      description: "Первый сигнал того, как движется верхняя часть воронки прямо сейчас.",
    },
    {
      icon: CalendarCheck2,
      tone: "bg-emerald-500/10 text-emerald-600",
      title: `${num(today?.bookings.newInPeriod ?? 0)} записей создано за 24 часа`,
      description: "Не просто посещения, а действие, которое двигает бизнес.",
    },
    {
      icon: Wifi,
      tone: "bg-teal-500/10 text-teal-600",
      title: `${num(online)} пользователей онлайн`,
      description: "Живая метрика, которая даёт ощущение системы, а не мёртвой панели.",
    },
    {
      icon: UserCheck,
      tone: "bg-violet-500/10 text-violet-600",
      title: `${Math.round(health?.emailVerificationRate ?? 0)}% email-верификации`,
      description: "Если верификация проседает, качество базы начинает деградировать раньше остального.",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 border border-primary/10 bg-primary/5 text-primary">
                <Sparkles className="h-3 w-3" />
                Control center
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock3 className="h-3 w-3" />
                Фокус на действиях
              </Badge>
            </div>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight sm:text-4xl">Вот твой бизнес сегодня</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Главный экран теперь не спорит сам с собой. Здесь только сигналы, риски, деньги и следующие шаги команды.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Сегодня"
                value={`+${num(today?.users.newInPeriod ?? 0)}`}
                detail={`${num(today?.bookings.newInPeriod ?? 0)} записей и ${num(online)} пользователей онлайн`}
              />
              <HeroMetric
                label="Риски"
                value={num((ac?.pendingComplaints ?? 0) + (ac?.unverifiedSalons ?? 0))}
                detail={`${num(ac?.pendingComplaints ?? 0)} жалоб и ${num(ac?.unverifiedSalons ?? 0)} салонов без проверки`}
                tone="text-orange-600"
              />
              <HeroMetric
                label="Платежи"
                value={num(ac?.paymentErrors24h ?? 0)}
                detail="Ошибки оплат за 24 часа. Денежный блок больше не спрятан."
                tone="text-rose-600"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/admin/complaints">
                <Button className="gap-2">
                  Разобрать жалобы
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/salons">
                <Button variant="outline" className="gap-2">
                  Проверить салоны
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" onClick={refreshAll} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Обновить
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/80 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Решить сейчас</p>
                <h3 className="mt-2 text-xl font-semibold">Очередь оператора</h3>
              </div>
              <Badge variant="outline">
                {(ac?.pendingComplaints ?? 0) + (ac?.unverifiedSalons ?? 0) + (ac?.paymentErrors24h ?? 0) + (ac?.expiringToday ?? 0)} задач
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {queue.map((item) => (
                <div key={item.title} className="rounded-lg border border-border/70 bg-card px-4 py-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge className={item.badgeClass}>{item.count}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Всего пользователей" value={num(s.users.total)} meta={`+${num(s.users.newInPeriod)} за ${RANGE_LABELS[range]}`} icon={Users} iconTone="bg-blue-500/10 text-blue-600" />
        <MiniStat label="Салоны" value={num(s.salons.total)} meta={`${num(s.salons.verified)} проверено`} icon={Store} iconTone="bg-fuchsia-500/10 text-fuchsia-600" />
        <MiniStat label="Мастера" value={num(s.masters.total)} meta={`+${num(s.masters.newInPeriod)} за ${RANGE_LABELS[range]}`} icon={Shield} iconTone="bg-amber-500/10 text-amber-600" />
        <MiniStat label="Записи" value={num(s.bookings.total)} meta={`+${num(s.bookings.newInPeriod)} за ${RANGE_LABELS[range]}`} icon={CalendarCheck2} iconTone="bg-emerald-500/10 text-emerald-600" />
      </section>

      <section className="grid gap-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Живая лента</CardTitle>
                <CardDescription>Небольшой поток сигналов, который даёт ощущение системы и реального движения.</CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Wifi className="h-3 w-3" />
                real-time
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {feed.map((item) => (
              <FeedRow key={item.title} {...item} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Рост и динамика</CardTitle>
                <CardDescription>Смотри на один поток за выбранный период, а не на всё сразу.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {RANGES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setRange(item)}
                      className={`px-3 py-1.5 text-sm ${range === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}
                    >
                      {RANGE_LABELS[item]}
                    </button>
                  ))}
                </div>
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {SERIES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setSeries(item)}
                      className={`px-3 py-1.5 text-sm ${series === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}
                    >
                      {SERIES_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {growthData?.growth?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData.growth} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={seriesColor} stopOpacity={0.24} />
                      <stop offset="95%" stopColor={seriesColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.45} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(value) => new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<GrowthTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={seriesColor} strokeWidth={2} fill="url(#adminGrowthGradient)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Данных по этой серии пока нет.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Воронка конверсии</CardTitle>
            <CardDescription>Рост полезен только тогда, когда пользователи доходят до действия.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelData ? (
              <>
                <FunnelRow label="Регистрации" value={funnelData.signups} max={funnelData.signups} barColor="bg-blue-500" />
                <FunnelRow label="Записи созданы" value={funnelData.bookingsCreated} max={funnelData.signups} barColor="bg-violet-500" />
                <FunnelRow label="Записи подтверждены" value={funnelData.bookingsCompleted} max={funnelData.signups} barColor="bg-emerald-500" />
                <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Конверсия регистрации в запись</p>
                      <p className="mt-1 text-sm text-muted-foreground">Сколько пользователей доходит до реального действия.</p>
                    </div>
                    <Badge variant="secondary" className="text-base font-semibold">{conversion}%</Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">{[...Array(4)].map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Здоровье платформы</CardTitle>
            <CardDescription>Ключевые показатели доверия и качества без стены однотипных блоков.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <FeedRow icon={Activity} tone="bg-blue-500/10 text-blue-600" title={`${num(health?.activeSessionsLast24h ?? 0)} активных сессий за 24ч`} description={`Средняя длительность: ${num(Math.round(health?.avgSessionDurationMinutes ?? 0))} минут.`} />
            <FeedRow icon={UserCheck} tone="bg-emerald-500/10 text-emerald-600" title={`${Math.round(health?.emailVerificationRate ?? 0)}% email-верификации`} description={`Телефон подтверждён у ${Math.round(health?.phoneVerificationRate ?? 0)}% пользователей.`} />
            <FeedRow icon={ShieldAlert} tone="bg-orange-500/10 text-orange-600" title={`${num(health?.pendingComplaints ?? 0)} жалоб ожидают решения`} description="Если эта цифра растёт, команда не успевает за качеством сервиса." />
            <FeedRow icon={UserX} tone="bg-rose-500/10 text-rose-600" title={`${(health?.blockedUserPercentage ?? 0).toFixed(1)}% пользователей заблокированы`} description="Это сигнал про качество потока, правила и верификацию." />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-xl">Деньги и платежи</CardTitle>
                <CardDescription>Финансовый блок должен жить рядом с рисками, а не прятаться внизу.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="text-sm font-medium text-muted-foreground">Ошибки оплаты за 24ч</p>
                <p className="mt-3 text-3xl font-semibold text-rose-600">{num(ac?.paymentErrors24h ?? 0)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Даже редкие ошибки должны быть видны с первого экрана.</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="text-sm font-medium text-muted-foreground">Подтверждённые записи</p>
                <p className="mt-3 text-3xl font-semibold">{num(funnelData?.bookingsCompleted ?? 0)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Ближайший доступный сигнал, что спрос дошёл до завершённого действия.</p>
              </div>
            </div>
            <ErrorBoundary fallback={<p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Виджет платёжного здоровья сейчас не загрузился, но dashboard остаётся рабочим.</p>}>
              <PaymentHealthWidget scope="platform" />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Фокус команды</p>
              <p className="text-sm text-muted-foreground">Сначала модерация и жалобы, потом деньги и каталог.</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Нормальная иерархия</p>
              <p className="text-sm text-muted-foreground">Важное ведёт интерфейс, а второстепенное не шумит.</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ощущение системы</p>
              <p className="text-sm text-muted-foreground">Админка стала ближе к control center, а не к набору страниц.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
