import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type HeroStatTone = "emerald" | "blue" | "amber" | "red" | "slate";

interface HeroStat {
  label: string;
  value: string | number;
  tone?: HeroStatTone;
}

interface OverviewMetric {
  label: string;
  value: string | number;
  progress: number;
  description: string;
}

interface FocusItem {
  icon: ReactNode;
  title: string;
  description: string;
}

const HERO_TONE_CLASSES: Record<HeroStatTone, string> = {
  emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
  blue: "border-blue-500/20 bg-blue-500/5 text-blue-600",
  amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
  red: "border-red-500/20 bg-red-500/5 text-red-600",
  slate: "border-slate-500/20 bg-slate-500/5 text-slate-800 dark:text-slate-100",
};

export function AdminPageHero({
  badge,
  counter,
  title,
  description,
  stats,
}: {
  badge: string;
  counter?: string;
  title: string;
  description: string;
  stats?: HeroStat[];
}) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {badge}
            </Badge>
            {counter ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {counter}
              </Badge>
            ) : null}
          </div>
          <div>
            <h1 className="text-3xl font-serif font-semibold">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
        </div>

        {stats?.length ? (
          <div className="grid min-w-[260px] gap-3 sm:grid-cols-3">
            {stats.map((stat) => {
              const tone = stat.tone ?? "slate";
              return (
                <div
                  key={stat.label}
                  className={`rounded-2xl border p-3 ${HERO_TONE_CLASSES[tone]}`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminOverviewSection({
  badge,
  title,
  description,
  metrics,
}: {
  badge: string;
  title: string;
  description: string;
  metrics: OverviewMetric[];
}) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {badge}
          </Badge>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className={`grid gap-4 ${metrics.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="font-medium">{metric.value}</span>
              </div>
              <Progress value={metric.progress} className="h-2" />
              <p className="mt-3 text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminFocusPanel({
  title = "Фокус смены",
  items,
}: {
  title?: string;
  items: FocusItem[];
}) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              {item.icon}
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminFilterChips({ filters, onReset }: { filters: string[]; onReset: () => void }) {
  const { t } = useTranslation();
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Badge key={filter} variant="secondary" className="rounded-full px-3 py-1">
          {filter}
        </Badge>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="h-8 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        {t("common.resetAll")}
      </button>
    </div>
  );
}
