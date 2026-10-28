import menHeroImage from "@assets/stock_images/professional_hair_co_bb7062a0.jpg";
import { AudienceSwitch, useAudience } from "@/components/audience-provider";
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck, MapPin, Search, Sparkles, Star } from "lucide-react";
import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";
import { CITY_KEYS } from "@shared/city-aliases";

// Canonical keys only — the displayed label is localized per-language below,
// and the search filter matches every known spelling via CITY_ALIASES.
const cities = CITY_KEYS;

/** Renders the last two words of a headline in the animated brand gradient. */
function AccentTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return <span className="text-gradient">{text}</span>;
  const head = words.slice(0, -2).join(" ");
  const tail = words.slice(-2).join(" ");
  return (
    <>
      {head} <span className="text-gradient italic">{tail}</span>
    </>
  );
}

export function HomeHero() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const men = audience === "men";
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section
      className="relative isolate overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36"
      data-testid="section-hero"
    >
      {/* Ambient decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dots [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
      <div className="pointer-events-none absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-[hsl(340_85%_60%/0.28)] blur-3xl animate-float" />
      <div className="pointer-events-none absolute right-[-6rem] top-40 -z-10 h-80 w-80 rounded-full bg-[hsl(15_90%_62%/0.22)] blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-64 w-64 rounded-full bg-[hsl(280_70%_60%/0.16)] blur-3xl animate-float" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex justify-center animate-fade-up">
          <AudienceSwitch />
        </div>

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Copy + search */}
          <div className="text-center lg:text-left">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary animate-fade-up"
              style={{ animationDelay: "60ms" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t(men ? "audience.menBadge" : "marketplace.hero.badge")}
            </span>

            <h1
              data-testid="hero-title"
              className="mt-6 font-serif text-[2.75rem] font-light leading-[1.02] tracking-[-0.02em] text-foreground sm:text-6xl xl:text-7xl animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <AccentTitle text={t(men ? "audience.menTitle" : "marketplace.hero.title")} />
            </h1>

            <p
              className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0 animate-fade-up"
              style={{ animationDelay: "180ms" }}
            >
              {t(men ? "audience.menSubtitle" : "marketplace.hero.subtitle")}
            </p>

            <form
              onSubmit={handleSearch}
              className="mx-auto mt-9 max-w-2xl lg:mx-0 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <div className="ring-gradient glass rounded-full p-1.5 shadow-xl shadow-primary/10 transition-shadow duration-500 focus-within:shadow-2xl focus-within:shadow-primary/25">
                <div className="flex items-center gap-2">
                  <Search className="ml-4 h-5 w-5 shrink-0 text-primary" />
                  <input
                    placeholder={t("marketplace.hero.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80 sm:h-14 sm:text-base"
                    aria-label={t("marketplace.hero.searchPlaceholder")}
                    data-testid="input-search-hero"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 shrink-0 px-6 sm:h-14 sm:px-8"
                    aria-label={t("marketplace.hero.search")}
                    data-testid="button-search-hero"
                  >
                    <span className="hidden sm:inline">{t("marketplace.hero.search")}</span>
                    <ArrowRight className="!size-5" />
                  </Button>
                </div>
              </div>
            </form>

            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm lg:justify-start animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <span className="mr-1 flex items-center gap-1.5 font-medium text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {t("marketplace.hero.popularCities")}
              </span>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => navigate(`/search?city=${city}`)}
                  className="rounded-full border border-foreground/10 bg-card/60 px-4 py-1.5 font-medium text-foreground/80 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                  data-testid={`link-city-${city}`}
                >
                  {t(`marketplace.hero.cities.${city}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div
            className="relative mx-auto w-full max-w-xl animate-scale-in"
            style={{ animationDelay: "200ms" }}
          >
            <div className="absolute -inset-4 -z-10 rounded-[2.75rem] bg-gradient-to-br from-[hsl(340_85%_60%/0.35)] via-transparent to-[hsl(15_90%_62%/0.3)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 shadow-2xl">
              <img
                key={audience}
                src={men ? menHeroImage : heroImage}
                alt={t(men ? "audience.menPhotoAlt" : "audience.heroAlt")}
                className="aspect-[4/5] w-full object-cover transition-transform [transition-duration:2000ms] ease-out-expo hover:scale-105 sm:aspect-[5/5]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85 backdrop-blur-md">
                {t(men ? "audience.menImage" : "marketplace.hero.imageLabel")}
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="font-serif text-3xl leading-tight text-white sm:text-4xl">
                  {t(men ? "audience.menCard" : "marketplace.hero.cardTitle")}
                </p>
              </div>
            </div>

            {/* Floating proof cards */}
            <div className="glass absolute -left-4 top-1/3 hidden items-center gap-3 rounded-2xl px-4 py-3 shadow-xl sm:flex animate-float">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {t("marketplace.hero.liveNow")}
                </p>
                <p className="text-xs text-muted-foreground">24/7</p>
              </div>
            </div>
            <div className="glass absolute -right-4 top-10 hidden items-center gap-2 rounded-2xl px-4 py-3 shadow-xl sm:flex animate-float-slow">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">5.0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
