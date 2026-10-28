import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SEO } from "@/components/SEO";
import {
  ArrowLeft,
  ArrowRight,
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
  type LucideIcon,
} from "lucide-react";

type Audience = {
  key: "clients" | "business";
  icon: LucideIcon;
  benefits: LucideIcon[];
  /** Tailwind classes for the accent tint of this audience */
  tint: string;
};

const AUDIENCES: Audience[] = [
  {
    key: "clients",
    icon: Users,
    benefits: [Search, Calendar, Bell, Clock, Star],
    tint: "from-[hsl(var(--primary)/0.22)]",
  },
  {
    key: "business",
    icon: Store,
    benefits: [TrendingUp, CalendarCheck, BellOff, BarChart3, Sparkles],
    tint: "from-[hsl(15_90%_62%/0.22)]",
  },
];

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="page-backdrop min-h-screen">
      <SEO title={t("about.seoTitle")} description={t("about.seoDescription")} />

      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="cabinet-topbar flex max-w-6xl items-center justify-between gap-4 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="icon" aria-label="AURELLE" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground">{t("about.title")}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-20">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary animate-fade-up">
            <Sparkles className="h-3.5 w-3.5" />
            AURELLE
          </span>
          <h2
            className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] text-foreground md:text-7xl animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            <span className="text-gradient">{t("about.hero.title")}</span>
          </h2>
          <p
            className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground animate-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            {t("about.hero.subtitle")}
          </p>
          <p
            className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground/80 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            {t("about.hero.description")}
          </p>
        </section>

        {/* Clients & business side by side */}
        <section className="grid gap-6 lg:grid-cols-2">
          {AUDIENCES.map(({ key, icon: Icon, benefits, tint }, col) => (
            <article
              key={key}
              className={`relative overflow-hidden rounded-[2rem] border border-foreground/[0.07] bg-gradient-to-br ${tint} via-card/80 to-card/80 p-7 shadow-xl backdrop-blur-xl sm:p-9 animate-fade-up`}
              style={{ animationDelay: `${col * 120}ms` }}
            >
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-card/80 text-primary shadow-md ring-1 ring-foreground/10">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-serif text-3xl font-light tracking-[-0.01em] text-foreground">
                  {t(`about.${key}.title`)}
                </h3>
              </div>

              <h4 className="mt-7 text-lg font-semibold text-foreground">
                {t(`about.${key}.whatIsIt`)}
              </h4>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t(`about.${key}.whatIsItAnswer`)}
              </p>

              <h4 className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t(`about.${key}.benefits`)}
              </h4>
              <ul className="mt-4 grid gap-2.5">
                {benefits.map((BenefitIcon, i) => (
                  <li
                    key={i}
                    className="group flex items-center gap-3 rounded-2xl border border-foreground/[0.06] bg-card/70 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <BenefitIcon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">
                      {t(`about.${key}.benefit${i + 1}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-7 rounded-2xl bg-primary/10 px-5 py-4 font-serif text-xl italic text-foreground">
                {t(`about.${key}.summary`)}
              </p>
            </article>
          ))}
        </section>

        {/* Why */}
        <section className="mx-auto mt-24 max-w-3xl text-center">
          <h3 className="font-serif text-4xl font-light tracking-[-0.01em] text-foreground md:text-5xl">
            {t("about.why.title")}
          </h3>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t("about.why.text1")}</p>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t("about.why.text2")}</p>
        </section>

        {/* Summary + CTA band */}
        <section className="cabinet-hero mt-20 text-center">
          <h3 className="font-serif text-3xl font-light text-foreground md:text-4xl">
            {t("about.summary.title")}
          </h3>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            {[
              { Icon: Users, text: t("about.summary.forClients") },
              { Icon: Store, text: t("about.summary.forBusiness") },
            ].map(({ Icon, text }) => (
              <div
                key={text}
                className="lift flex items-center gap-4 rounded-2xl border border-foreground/[0.07] bg-card/70 p-5 text-left"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="font-medium text-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 font-serif text-2xl italic text-foreground">
            {t("about.summary.tagline")}
          </p>
          <Link href="/">
            <Button size="lg" className="mt-8 px-10">
              {t("about.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
