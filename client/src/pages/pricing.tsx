import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Check, Zap, Star, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface Plan {
  slug: string;
  nameKey: string;
  priceMonthly: number | null;
  trialDays: number;
  featuresKeys: string[];
  highlighted?: boolean;
  icon: React.ReactNode;
}

const PLANS: Plan[] = [
  {
    slug: "free",
    nameKey: "pricing.plans.free.name",
    priceMonthly: 0,
    trialDays: 0,
    icon: <Star className="h-5 w-5" />,
    featuresKeys: ["pricing.plans.free.f1", "pricing.plans.free.f2", "pricing.plans.free.f3"],
  },
  {
    slug: "starter",
    nameKey: "pricing.plans.starter.name",
    priceMonthly: 149_000,
    trialDays: 14,
    icon: <Zap className="h-5 w-5" />,
    highlighted: true,
    featuresKeys: [
      "pricing.plans.starter.f1",
      "pricing.plans.starter.f2",
      "pricing.plans.starter.f3",
      "pricing.plans.starter.f4",
    ],
  },
  {
    slug: "pro",
    nameKey: "pricing.plans.pro.name",
    priceMonthly: 349_000,
    trialDays: 14,
    icon: <Building2 className="h-5 w-5" />,
    featuresKeys: [
      "pricing.plans.pro.f1",
      "pricing.plans.pro.f2",
      "pricing.plans.pro.f3",
      "pricing.plans.pro.f4",
      "pricing.plans.pro.f5",
    ],
  },
];

function formatPrice(uzs: number | null): string {
  if (uzs === null || uzs === 0) return "0";
  return uzs.toLocaleString("ru-UZ");
}

export default function PricingPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="page-backdrop min-h-screen">
      {/* Header */}
      <div className="px-4 py-20 text-center sm:py-28">
        <Badge className="mb-6 border-primary/20 bg-primary/10 px-4 py-1.5 text-primary animate-fade-up">
          {t("pricing.badge")}
        </Badge>
        <h1
          className="mx-auto max-w-3xl font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] md:text-7xl animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <span className="text-gradient">{t("pricing.title")}</span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground animate-fade-up"
          style={{ animationDelay: "140ms" }}
        >
          {t("pricing.subtitle")}
        </p>
      </div>

      {/* Plans grid */}
      <div className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Card
              key={plan.slug}
              className={`lift relative flex flex-col rounded-[2rem] animate-fade-up ${
                plan.highlighted
                  ? "ring-gradient border-transparent bg-gradient-to-b from-primary/15 to-card/80 shadow-2xl shadow-primary/20"
                  : "border-foreground/[0.07]"
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1 shadow-glow">{t("pricing.popular")}</Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-8">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-2xl ${plan.highlighted ? "bg-primary text-primary-foreground shadow-glow" : "bg-primary/10 text-primary"}`}
                  >
                    {plan.icon}
                  </div>
                  <h2 className="font-serif text-2xl">{t(plan.nameKey)}</h2>
                </div>

                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-semibold tracking-[-0.03em] tabular-nums">
                    {formatPrice(plan.priceMonthly)}
                  </span>
                  {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                    <span className="text-muted-foreground mb-1">{t("pricing.perMonth")}</span>
                  )}
                  {plan.priceMonthly === 0 && (
                    <span className="text-muted-foreground mb-1 text-sm">{t("pricing.free")}</span>
                  )}
                </div>

                {plan.trialDays > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {t("pricing.trialDays", { count: plan.trialDays })}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 pb-6">
                <ul className="space-y-3 border-t border-foreground/[0.07] pt-5">
                  {plan.featuresKeys.map((key) => (
                    <li key={key} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pb-8">
                <Button
                  size="lg"
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  {plan.priceMonthly === 0
                    ? t("pricing.startFree")
                    : plan.trialDays > 0
                      ? t("pricing.startTrial")
                      : t("pricing.getStarted")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Enterprise */}
        <Card className="glass mt-10 rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-between gap-4 py-7 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{t("pricing.enterprise.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("pricing.enterprise.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2 shrink-0">
              <Phone className="h-4 w-4" />
              {t("pricing.enterprise.cta")}
            </Button>
          </CardContent>
        </Card>

        {/* FAQ note */}
        <p className="text-center text-sm text-muted-foreground mt-10">{t("pricing.vatNote")}</p>
      </div>
    </div>
  );
}
