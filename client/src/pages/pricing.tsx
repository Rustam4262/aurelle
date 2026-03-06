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
    featuresKeys: [
      "pricing.plans.free.f1",
      "pricing.plans.free.f2",
      "pricing.plans.free.f3",
    ],
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="py-16 px-4 text-center">
        <Badge variant="secondary" className="mb-4">
          {t("pricing.badge")}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("pricing.title")}</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t("pricing.subtitle")}</p>
      </div>

      {/* Plans grid */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.slug}
              className={
                plan.highlighted
                  ? "border-primary shadow-lg ring-2 ring-primary relative"
                  : "border"
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">{t("pricing.popular")}</Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`p-2 rounded-lg ${plan.highlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {plan.icon}
                  </div>
                  <h2 className="text-xl font-semibold">{t(plan.nameKey)}</h2>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</span>
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

              <CardContent className="pb-6">
                <ul className="space-y-2.5">
                  {plan.featuresKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
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
        <Card className="mt-8 bg-muted/30">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background border">
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
        <p className="text-center text-sm text-muted-foreground mt-10">
          {t("pricing.vatNote")}
        </p>
      </div>
    </div>
  );
}
