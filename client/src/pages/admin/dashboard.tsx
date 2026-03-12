import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { PaymentHealthWidget } from "@/components/payment-health-widget";
import { ErrorBoundary } from "@/components/error-boundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Store,
  Calendar,
  AlertCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  Clock,
  RefreshCw,
  Info,
  Flame,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Types Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

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

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Sub-components Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(7)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tooltipText: string;
  accentClass?: string;
  isOnline?: boolean;
  href?: string;
}

function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  tooltipText,
  accentClass,
  isOnline,
  href,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  const cardContent = (
    <Card className={`${accentClass ?? ""} ${href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className={`p-1.5 rounded-md ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
          {isOnline && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </span>
          )}
        </div>
        {delta !== undefined && (
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {delta} {deltaLabel}
          </p>
        )}
        {subtitle && delta === undefined && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {subtitle && delta !== undefined && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }
  return cardContent;
}

interface ActionItemProps {
  count: number;
  label: string;
  href: string;
  color: string;
  goToLabel: string;
}

function ActionItem({ count, label, href, color, goToLabel }: ActionItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
      <div>
        <div className={`text-2xl font-bold ${color}`}>{count}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
      <Link href={href}>
        <Button variant="outline" size="sm" className="text-xs h-7">
          {goToLabel}
        </Button>
      </Link>
    </div>
  );
}

interface FunnelBarProps {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}

function FunnelBar({ label, value, max, colorClass }: FunnelBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-14 text-right tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Custom recharts tooltip Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-1">
        {new Date(label).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
      </p>
      <p className="font-semibold text-foreground">{payload[0].value}</p>
    </div>
  );
}

// Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Main component Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

const QUERY_OPTS = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } as const;
const RANGES: RangeKey[] = ["24h", "7d", "30d", "90d"];
const SERIES: SeriesKey[] = ["users", "salons", "bookings"];
const SERIES_COLORS: Record<SeriesKey, string> = {
  users: "#3b82f6",
  salons: "#8b5cf6",
  bookings: "#10b981",
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>("30d");
  const [growthSeries, setGrowthSeries] = useState<SeriesKey>("users");

  // Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Queries Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

  const {
    data: stats,
    isLoading,
    isError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard", { range }],
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
    queryKey: ["/api/admin/dashboard/user-growth", { range, series: growthSeries }],
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

  const refetchAll = () => {
    refetchStats();
    refetchOnline();
  };

  // Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Derived values Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

  const s = stats?.stats;
  const ac = actionCenter;
  const hasActionItems =
    (ac?.unverifiedSalons ?? 0) +
      (ac?.pendingComplaints ?? 0) +
      (ac?.paymentErrors24h ?? 0) +
      (ac?.expiringToday ?? 0) >
    0;

  const seriesColor = SERIES_COLORS[growthSeries];

  const rangeLabel = t(`admin.dashboard.period.${range}`);

  // Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ Render Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚

  return (
    <div className="space-y-8 pb-8">
      <Card className="border-border/70 bg-card/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full px-3 py-1">Control room</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">Range: {range}</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                {t("admin.dashboard.title") || "Admin dashboard"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.dashboard.subtitle") || "Platform overview and operational signals"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex overflow-hidden rounded-xl border text-sm">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 transition-colors ${
                    range === r
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {t(`admin.dashboard.period.${r}`)}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={refetchAll} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("admin.dashboard.refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 2. Error state Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("admin.dashboard.errorLoading")}</AlertTitle>
          <AlertDescription className="mt-2">
            <Button size="sm" variant="outline" onClick={() => refetchStats()}>
              {t("admin.dashboard.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 3. KPI Cards Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <Card className="border-border/70 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Operations snapshot</CardTitle>
            <CardDescription>Focus the team on the next moderation and trust actions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attention queue</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{((ac?.unverifiedSalons ?? 0) + (ac?.pendingComplaints ?? 0) + (ac?.paymentErrors24h ?? 0) + (ac?.expiringToday ?? 0)).toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open moderation and payment issues across the platform.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Verification mix</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{platformHealth ? `${Math.round((platformHealth.health.emailVerificationRate + platformHealth.health.phoneVerificationRate) / 2)}%` : "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Average of email and phone verification completion.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live sessions</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{platformHealth?.health.activeSessionsLast24h?.toLocaleString() ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sessions seen in the last 24 hours.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Complaint load</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{platformHealth?.health.pendingComplaints?.toLocaleString() ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cases that still need a moderator decision.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick routes</CardTitle>
            <CardDescription>Fast transitions to the places admins use most often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/complaints"><Button variant="outline" className="w-full justify-between">Complaints <AlertCircle className="h-4 w-4" /></Button></Link>
            <Link href="/admin/salons"><Button variant="outline" className="w-full justify-between">Salons review <Store className="h-4 w-4" /></Button></Link>
            <Link href="/admin/users"><Button variant="outline" className="w-full justify-between">Users desk <Users className="h-4 w-4" /></Button></Link>
            <Link href="/admin/sanctions"><Button variant="outline" className="w-full justify-between">Sanctions <Shield className="h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>
      </div>
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users */}
          <KpiCard
            title={t("marketplace.admin.dashboard.totalUsers") || "Р В РЎСџР В РЎвЂўР В Р’В»Р РЋР Р‰Р В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В Р’В»Р В РЎвЂ"}
            value={s?.users.total ?? 0}
            delta={(s?.users.newInPeriod ?? 0) - (s?.users.prevPeriod ?? 0)}
            deltaLabel={rangeLabel}
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
            tooltipText={t("admin.dashboard.tooltip.users")}
            href="/admin/users"
          />

          {/* Salons */}
          <KpiCard
            title={t("marketplace.admin.dashboard.salons") || "Р В Р Р‹Р В Р’В°Р В Р’В»Р В РЎвЂўР В Р вЂ¦Р РЋРІР‚в„–"}
            value={s?.salons.total ?? 0}
            delta={s?.salons.newInPeriod ?? 0}
            deltaLabel={rangeLabel}
            subtitle={t("marketplace.admin.dashboard.verified", { count: s?.salons.verified ?? 0 })}
            icon={Store}
            color="text-purple-600"
            bgColor="bg-purple-100 dark:bg-purple-900/30"
            tooltipText={t("admin.dashboard.tooltip.salons")}
            href="/admin/salons"
          />

          {/* Masters */}
          <KpiCard
            title={t("marketplace.admin.dashboard.masters") || "Р В РЎС™Р В Р’В°Р РЋР С“Р РЋРІР‚С™Р В Р’ВµР РЋР вЂљР В Р’В°"}
            value={s?.masters.total ?? 0}
            delta={s?.masters.newInPeriod ?? 0}
            deltaLabel={rangeLabel}
            icon={UserCheck}
            color="text-green-600"
            bgColor="bg-green-100 dark:bg-green-900/30"
            tooltipText={t("admin.dashboard.tooltip.masters")}
          />

          {/* Bookings */}
          <KpiCard
            title={t("marketplace.admin.dashboard.totalBookings") || "Р В РІР‚вЂќР В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ"}
            value={s?.bookings.total ?? 0}
            delta={(s?.bookings.newInPeriod ?? 0) - (s?.bookings.prevPeriod ?? 0)}
            deltaLabel={rangeLabel}
            icon={Calendar}
            color="text-orange-600"
            bgColor="bg-orange-100 dark:bg-orange-900/30"
            tooltipText={t("admin.dashboard.tooltip.bookings")}
          />

          {/* Open Complaints */}
          <KpiCard
            title={t("marketplace.admin.dashboard.openComplaints") || "Р В РЎвЂєР РЋРІР‚С™Р В РЎвЂќР РЋР вЂљР РЋРІР‚в„–Р РЋРІР‚С™Р РЋРІР‚в„–Р В Р’Вµ Р В Р’В¶Р В Р’В°Р В Р’В»Р В РЎвЂўР В Р’В±Р РЋРІР‚в„–"}
            value={s?.moderation.openComplaints ?? 0}
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-100 dark:bg-red-900/30"
            tooltipText={t("admin.dashboard.tooltip.complaints")}
            accentClass={
              (s?.moderation.openComplaints ?? 0) > 0
                ? "border-l-4 border-l-red-500"
                : undefined
            }
            href="/admin/complaints"
          />

          {/* Active Sanctions */}
          <KpiCard
            title={t("marketplace.admin.dashboard.activeSanctions") || "Р В РЎвЂ™Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂќР РЋРІР‚В Р В РЎвЂР В РЎвЂ"}
            value={s?.moderation.activeSanctions ?? 0}
            icon={Shield}
            color="text-amber-600"
            bgColor="bg-amber-100 dark:bg-amber-900/30"
            tooltipText={t("admin.dashboard.tooltip.sanctions")}
            accentClass={
              (s?.moderation.activeSanctions ?? 0) > 0
                ? "border-l-4 border-l-amber-500"
                : undefined
            }
            href="/admin/sanctions"
          />

          {/* Online Now Р Р†Р вЂљРІР‚Сњ spans 2 cols */}
          <Card className="col-span-2 border-green-200 dark:border-green-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {t("admin.dashboard.onlineUsers") || "Р В РЎвЂєР В Р вЂ¦Р В Р’В»Р В Р’В°Р В РІвЂћвЂ“Р Р… Р РЋР С“Р В Р’ВµР В РІвЂћвЂ“Р РЋРІР‚РЋР В Р’В°Р РЋР С“"}
              </CardTitle>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {t("admin.dashboard.tooltip.online")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {onlineData?.onlineUsers?.toLocaleString() ?? 0}
                </div>
                <Wifi className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.dashboard.onlineSubtitle") || "Р В РЎвЂ™Р В РЎвЂќР РЋРІР‚С™Р В РЎвЂР В Р вЂ Р В Р вЂ¦Р РЋРІР‚в„– Р Р† Р В РЎвЂ”Р В РЎвЂўР РЋР С“Р В Р’В»Р В Р’ВµР В РўвЂР В Р вЂ¦Р В РЎвЂР В Р’Вµ 10 Р В РЎВР В РЎвЂР В Р вЂ¦Р РЋРЎвЂњР РЋРІР‚С™"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 4. Action Center Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      {hasActionItems && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50/40 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-orange-500" />
              {t("admin.dashboard.actionCenter.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(ac?.unverifiedSalons ?? 0) > 0 && (
                <ActionItem
                  count={ac!.unverifiedSalons}
                  label={t("admin.dashboard.actionCenter.unverifiedSalons")}
                  href="/admin/salons"
                  color="text-orange-600"
                  goToLabel={t("admin.dashboard.actionCenter.goTo")}
                />
              )}
              {(ac?.pendingComplaints ?? 0) > 0 && (
                <ActionItem
                  count={ac!.pendingComplaints}
                  label={t("admin.dashboard.actionCenter.pendingComplaints")}
                  href="/admin/complaints"
                  color="text-red-600"
                  goToLabel={t("admin.dashboard.actionCenter.goTo")}
                />
              )}
              {(ac?.paymentErrors24h ?? 0) > 0 && (
                <ActionItem
                  count={ac!.paymentErrors24h}
                  label={t("admin.dashboard.actionCenter.paymentErrors")}
                  href="/admin/dashboard"
                  color="text-rose-600"
                  goToLabel={t("admin.dashboard.actionCenter.goTo")}
                />
              )}
              {(ac?.expiringToday ?? 0) > 0 && (
                <ActionItem
                  count={ac!.expiringToday}
                  label={t("admin.dashboard.actionCenter.expiringToday")}
                  href="/admin/sanctions"
                  color="text-amber-600"
                  goToLabel={t("admin.dashboard.actionCenter.goTo")}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 5. Charts row Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">
                  {t("admin.dashboard.userGrowthTitle") || "Р В Р’В Р В РЎвЂўР РЋР С“Р РЋРІР‚С™ Р В РЎвЂ”Р В Р’В»Р В Р’В°Р РЋРІР‚С™Р РЋРІР‚С›Р В РЎвЂўР РЋР вЂљР В РЎВР РЋРІР‚в„–"}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {t("admin.dashboard.userGrowthSubtitle") || "Р В РЎСљР В РЎвЂўР В Р вЂ Р РЋРІР‚в„–Р В Р’Вµ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ Р В Р’В·Р В Р’В° Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В РЎвЂР В РЎвЂўР В РўвЂ"}
                </CardDescription>
              </div>
              {/* Series tabs */}
              <div className="flex rounded-md border overflow-hidden text-xs">
                {SERIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setGrowthSeries(s)}
                    className={`px-2.5 py-1 transition-colors ${
                      growthSeries === s
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t(`admin.dashboard.growthSeries.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!growthData ? (
              /* Skeleton bars while data loads */
              <div className="h-[240px] flex flex-col gap-3 pt-2">
                <div className="flex items-end gap-1.5 flex-1 px-2">
                  {[35, 55, 40, 70, 50, 80, 60, 90, 65, 75, 45, 85].map((h, i) => (
                    <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between px-2 pb-1">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-3 w-10" />
                  ))}
                </div>
              </div>
            ) : growthData.growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthData.growth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSeries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={seriesColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={seriesColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<GrowthTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={seriesColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradSeries)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                {t("admin.dashboard.funnel.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("admin.dashboard.funnel.title")}</CardTitle>
            <CardDescription>{t("admin.dashboard.funnel.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData ? (
              <div className="space-y-4 py-4">
                <FunnelBar
                  label={t("admin.dashboard.funnel.signups")}
                  value={funnelData.signups}
                  max={funnelData.signups}
                  colorClass="bg-blue-500"
                />
                <FunnelBar
                  label={t("admin.dashboard.funnel.bookingsCreated")}
                  value={funnelData.bookingsCreated}
                  max={funnelData.signups}
                  colorClass="bg-purple-500"
                />
                <FunnelBar
                  label={t("admin.dashboard.funnel.bookingsCompleted")}
                  value={funnelData.bookingsCompleted}
                  max={funnelData.signups}
                  colorClass="bg-green-500"
                />

                {/* Conversion rate callout */}
                {funnelData.signups > 0 && (
                  <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Р В РЎв„ўР В РЎвЂўР В Р вЂ¦Р В Р вЂ Р В Р’ВµР РЋР вЂљР РЋР С“Р В РЎвЂРЎРЏ Р РЋР вЂљР В Р’ВµР В РЎвЂ“Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р РЋРІР‚В Р В РЎвЂРЎРЏ Р Р†РІР‚В РІР‚в„ў Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р РЋР Р‰</span>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {((funnelData.bookingsCreated / funnelData.signups) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center">
                <div className="space-y-3 w-full px-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 6. Platform Health Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            {t("admin.dashboard.platformHealth")}
          </CardTitle>
          <CardDescription>{t("admin.dashboard.platformHealthSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {platformHealth ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Activity,
                  color: "text-blue-600",
                  label: t("admin.dashboard.metrics.activeSessions"),
                  desc: t("admin.dashboard.metrics.activeSessDesc"),
                  value: platformHealth.health.activeSessionsLast24h,
                  fmt: (v: number) => v.toString(),
                },
                {
                  icon: Clock,
                  color: "text-purple-600",
                  label: t("admin.dashboard.metrics.avgSession"),
                  desc: t("admin.dashboard.metrics.avgSessDesc"),
                  value: platformHealth.health.avgSessionDurationMinutes,
                  fmt: (v: number) => `${v}m`,
                },
                {
                  icon: UserCheck,
                  color: "text-green-600",
                  label: t("admin.dashboard.metrics.emailVerified"),
                  desc: t("admin.dashboard.metrics.emailVerifDesc"),
                  value: platformHealth.health.emailVerificationRate,
                  fmt: (v: number) => `${Math.round(v)}%`,
                },
                {
                  icon: UserCheck,
                  color: "text-teal-600",
                  label: t("admin.dashboard.metrics.phoneVerified"),
                  desc: t("admin.dashboard.metrics.phoneVerifDesc"),
                  value: platformHealth.health.phoneVerificationRate,
                  fmt: (v: number) => `${Math.round(v)}%`,
                },
                {
                  icon: AlertCircle,
                  color: "text-orange-600",
                  label: t("admin.dashboard.metrics.pendingComplaints"),
                  desc: t("admin.dashboard.metrics.pendingComplDesc"),
                  value: platformHealth.health.pendingComplaints,
                  fmt: (v: number) => v.toString(),
                },
                {
                  icon: Shield,
                  color: "text-red-600",
                  label: t("admin.dashboard.metrics.blockedUsers"),
                  desc: t("admin.dashboard.metrics.blockedUsersDesc"),
                  value: platformHealth.health.blockedUserPercentage,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                },
              ].map(({ icon: Ic, color, label, desc, value, fmt }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40"
                >
                  <div className={`mt-0.5 ${color}`}>
                    <Ic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <div className={`text-lg font-bold ${color} shrink-0`}>{fmt(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Р Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ 7. Payment Health Р Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚СњР вЂљР Р†РІР‚ќР‚ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("admin.dashboard.paymentHealth") || "Р В РІР‚вЂќР В РўвЂР В РЎвЂўР РЋР вЂљР В РЎвЂўР В Р вЂ Р РЋР Р‰Р В Р’Вµ Р В РЎвЂ”Р В Р’В»Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В Р’В¶Р В Р’ВµР В РІвЂћвЂ“"}
          </CardTitle>
          <CardDescription>
            {t("admin.dashboard.paymentHealthSubtitle") || "Р В Р Р‹Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р РЋРЎвЂњР РЋР С“ Р РЋРІР‚С™Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В Р’В·Р В Р’В°Р В РЎвЂќР РЋРІР‚В Р В РЎвЂР В РІвЂћвЂ“ Р В РЎвЂ Р В РЎвЂўР РЋРІвЂљВ¬Р В РЎвЂР В Р’В±Р В РЎвЂќР В РЎвЂ"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorBoundary fallback={
            <p className="py-4 text-sm text-muted-foreground text-center">
              Р В РІР‚СњР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ Р С• Р В РЎвЂ”Р В Р’В»Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В Р’В¶Р В Р’В°Р РЋРІР‚В¦ Р В Р вЂ Р РЋР вЂљР В Р’ВµР В РЎВР В Р’µР Р…Р Р…Р С• Р В Р вЂ¦Р В Р’ВµР В РўвЂР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В РЎвЂ”Р В Р вЂ¦Р РЋРІР‚в„–
            </p>
          }>
            <PaymentHealthWidget scope="platform" />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
}
