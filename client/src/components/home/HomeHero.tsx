import menHeroImage from "@assets/stock_images/professional_hair_co_bb7062a0.jpg";
import { AudienceSwitch, useAudience } from "@/components/audience-provider";
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Sparkles } from "lucide-react";
import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";
import { CITY_KEYS } from "@shared/city-aliases";

// Canonical keys only — the displayed label is localized per-language below,
// and the search filter matches every known spelling via CITY_ALIASES.
const cities = CITY_KEYS;

export function HomeHero() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const men = audience === "men";
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section
      className="relative overflow-hidden px-4 pb-8 pt-[88px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-[104px]"
      data-testid="section-hero"
    >
      <div className="absolute inset-0 audience-hero-background" />

      <div className="relative mx-auto max-w-7xl">
        <AudienceSwitch />
        <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <div className="max-w-3xl">
            <Badge className="rounded-full border border-primary/15 bg-card/85 px-4 py-1.5 text-foreground shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {t(men ? "audience.menBadge" : "marketplace.hero.badge")}
            </Badge>

            <h1
              data-testid="hero-title"
              className="mt-4 font-serif text-4xl font-light leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-5xl xl:text-6xl dark:text-white"
            >
              {t(men ? "audience.menTitle" : "marketplace.hero.title")}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-6 text-slate-600 dark:text-zinc-300">
              {t(men ? "audience.menSubtitle" : "marketplace.hero.subtitle")}
            </p>

            <form onSubmit={handleSearch} className="mt-5 max-w-2xl">
              <div className="rounded-[2rem] border border-border/70 bg-card p-2 shadow-2xl shadow-primary/10 transition-all focus-within:border-primary/25 dark:border-white/15 dark:bg-white/10 dark:shadow-black/20">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-white/55" />
                    <Input
                      placeholder={t("marketplace.hero.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 rounded-full border-0 bg-transparent pl-12 text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:placeholder:text-white/40 sm:h-14"
                      data-testid="input-search-hero"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20 sm:h-14 sm:px-9"
                    data-testid="button-search-hero"
                  >
                    {t("marketplace.hero.search")}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-white/70">
              <span className="flex items-center gap-2 pr-2 font-medium text-slate-900 dark:text-white">
                <MapPin className="h-4 w-4 text-primary" />
                {t("marketplace.hero.popularCities")}
              </span>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => navigate(`/search?city=${city}`)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:text-slate-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
                  data-testid={`link-city-${city}`}
                >
                  {t(`marketplace.hero.cities.${city}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-primary/10 dark:border-white/10 dark:shadow-black/25">
              <div className="relative h-[200px] overflow-hidden sm:h-[260px] lg:h-[340px]">
                <img
                  key={audience}
                  src={men ? menHeroImage : heroImage}
                  alt={t(men ? "audience.menPhotoAlt" : "audience.heroAlt")}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />

                <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-4">
                  <div className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 backdrop-blur">
                    {t(men ? "audience.menImage" : "marketplace.hero.imageLabel")}
                  </div>
                  <div className="rounded-full border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-xs text-emerald-100 backdrop-blur">
                    {t("marketplace.hero.liveNow")}
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5">
                  <div className="rounded-[1.75rem] border border-white/15 bg-black/40 p-5 text-white backdrop-blur-xl">
                    <p className="font-serif text-2xl leading-tight sm:text-3xl">
                      {t(men ? "audience.menCard" : "marketplace.hero.cardTitle")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
