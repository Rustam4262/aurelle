import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowLeft,
  Search,
  Calendar,
  Bell,
  Clock,
  Star,
  TrendingUp,
  CalendarCheck,
  BellOff,
  BarChart3,
  Sparkles,
  Users,
  Store,
} from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">{t("about.title")}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground">
              {t("about.hero.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("about.hero.subtitle")}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("about.hero.description")}
            </p>
          </div>

          {/* For Clients */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-serif text-3xl text-foreground">{t("about.clients.title")}</h3>
            </div>

            <Card className="p-8 space-y-6">
              <div>
                <h4 className="text-xl font-medium text-foreground mb-2">
                  {t("about.clients.whatIsIt")}
                </h4>
                <p className="text-muted-foreground text-lg">
                  {t("about.clients.whatIsItAnswer")}
                </p>
              </div>

              <div>
                <h4 className="text-xl font-medium text-foreground mb-4">
                  {t("about.clients.benefits")}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.clients.benefit1")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.clients.benefit2")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.clients.benefit3")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.clients.benefit4")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.clients.benefit5")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-lg font-medium text-foreground">
                  {t("about.clients.summary")}
                </p>
              </div>
            </Card>
          </section>

          {/* For Business */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10">
                <Store className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-serif text-3xl text-foreground">{t("about.business.title")}</h3>
            </div>

            <Card className="p-8 space-y-6">
              <div>
                <h4 className="text-xl font-medium text-foreground mb-2">
                  {t("about.business.whatIsIt")}
                </h4>
                <p className="text-muted-foreground text-lg">
                  {t("about.business.whatIsItAnswer")}
                </p>
              </div>

              <div>
                <h4 className="text-xl font-medium text-foreground mb-4">
                  {t("about.business.benefits")}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.business.benefit1")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CalendarCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.business.benefit2")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <BellOff className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.business.benefit3")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.business.benefit4")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("about.business.benefit5")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <p className="text-lg font-medium text-foreground">
                  {t("about.business.summary")}
                </p>
              </div>
            </Card>
          </section>

          {/* Why Section */}
          <section className="space-y-6">
            <h3 className="font-serif text-3xl text-foreground text-center">
              {t("about.why.title")}
            </h3>
            <Card className="p-8 text-center space-y-4">
              <p className="text-lg text-muted-foreground">
                {t("about.why.text1")}
              </p>
              <p className="text-lg text-muted-foreground">
                {t("about.why.text2")}
              </p>
            </Card>
          </section>

          {/* Summary */}
          <section className="space-y-6">
            <h3 className="font-serif text-3xl text-foreground text-center">
              {t("about.summary.title")}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 text-center space-y-3 hover-elevate">
                <Users className="h-12 w-12 text-primary mx-auto" />
                <p className="text-lg font-medium text-foreground">
                  {t("about.summary.forClients")}
                </p>
              </Card>
              <Card className="p-6 text-center space-y-3 hover-elevate">
                <Store className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-medium text-foreground">
                  {t("about.summary.forBusiness")}
                </p>
              </Card>
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-foreground">
                {t("about.summary.tagline")}
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center space-y-4 pt-8">
            <Link href="/">
              <Button size="lg" className="px-8">
                {t("about.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
