import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Store, UserRound } from "lucide-react";

export function HomeCTA() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
      data-testid="section-cta"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,29,96,0.12),transparent_24%),radial-gradient(circle_at_82%_80%,rgba(255,191,219,0.18),transparent_28%),linear-gradient(180deg,hsl(var(--background))_0%,rgba(248,240,244,0.82)_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-[0_30px_80px_-40px_rgba(200,29,96,0.45)] backdrop-blur-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Aurelle platform
              </div>
              <h2 className="mt-6 max-w-2xl font-serif text-4xl font-light leading-tight text-foreground md:text-5xl lg:text-6xl">
                {t("marketplace.cta.title")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {t("marketplace.cta.subtitle")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/owner">
                  <Button
                    size="lg"
                    className="h-14 rounded-full px-8 text-base shadow-lg shadow-primary/25"
                    data-testid="button-register-salon-cta"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    {t("marketplace.cta.registerSalon")}
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-full px-8 text-base"
                    data-testid="button-join-client-cta"
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    {t("marketplace.cta.joinClient")}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 self-stretch sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-border/60 bg-background/75 p-5">
                <p className="text-sm font-medium text-muted-foreground">{t("marketplace.cta.forClients")}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{t("marketplace.cta.clientTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("marketplace.cta.clientDescription")}
                </p>
                <Link href="/search">
                  <Button variant="ghost" className="mt-4 rounded-full px-0 text-primary hover:bg-transparent">
                    {t("marketplace.nav.explore")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-[1.75rem] border border-primary/15 bg-primary/5 p-5">
                <p className="text-sm font-medium text-primary">{t("marketplace.cta.forOwners")}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{t("marketplace.cta.ownerTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("marketplace.cta.ownerDescription")}
                </p>
                <Link href="/owner">
                  <Button variant="ghost" className="mt-4 rounded-full px-0 text-primary hover:bg-transparent">
                    {t("marketplace.nav.forOwners")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
