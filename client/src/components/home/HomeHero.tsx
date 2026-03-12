import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
} from "lucide-react";
import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";

const cities = ["Tashkent", "Samarkand", "Bukhara"];

export function HomeHero() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-[96px] sm:px-6 lg:px-8 lg:pb-16 lg:pt-[120px]" data-testid="section-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,54,116,0.12),transparent_26%),linear-gradient(180deg,#fffafc_0%,#fff4f8_52%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(200,29,96,0.14),transparent_28%),linear-gradient(180deg,#09090b_0%,#111116_45%,#09090b_100%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <div className="max-w-3xl">
            <Badge className="rounded-full border border-primary/15 bg-white/85 px-4 py-1.5 text-foreground shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Premium beauty marketplace
            </Badge>

            <h1 data-testid="hero-title" className="mt-6 font-serif text-4xl font-light leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-7xl dark:text-white">
              {t("marketplace.hero.title")}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg lg:text-xl dark:text-white/72">
              {t("marketplace.hero.subtitle")}
            </p>

            <form onSubmit={handleSearch} className="mt-8 max-w-2xl">
              <div className="rounded-[2rem] border border-border/70 bg-white p-2 shadow-2xl shadow-primary/10 transition-all focus-within:border-primary/25 dark:border-white/15 dark:bg-white/10 dark:shadow-black/20">
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
                  <Button type="submit" size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20 sm:h-14 sm:px-9" data-testid="button-search-hero">
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
                  onClick={() => navigate(`/search?city=${city.toLowerCase()}`)}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:text-slate-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
                  data-testid={`link-city-${city.toLowerCase()}`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/search">
                <Button className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25" data-testid="button-hero-explore">
                  {t("marketplace.nav.explore")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/owner">
                <Button variant="outline" className="h-12 rounded-full border-border bg-white px-7 text-base text-slate-900 shadow-sm hover:bg-muted dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700" data-testid="button-hero-for-owners">
                  <Store className="mr-2 h-4 w-4" />
                  {t("marketplace.nav.forOwners")}
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                <div className="text-3xl font-semibold text-slate-950 dark:text-white">500+</div>
                <div className="mt-2 text-slate-600 dark:text-zinc-400">{t("marketplace.stats.salons")}</div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                <div className="text-3xl font-semibold text-slate-950 dark:text-white">10k+</div>
                <div className="mt-2 text-slate-600 dark:text-zinc-400">{t("marketplace.stats.clients")}</div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                <div className="text-3xl font-semibold text-slate-950 dark:text-white">4.9/5</div>
                <div className="mt-2 text-slate-600 dark:text-zinc-400">Trusted beauty booking</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-primary/10 dark:border-white/10 dark:shadow-black/25">
              <div className="relative h-[280px] overflow-hidden sm:h-[340px] lg:h-[420px]">
                <img src={heroImage} alt="Luxury beauty salon" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />

                <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-4">
                  <div className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 backdrop-blur">
                    Aurelle selection
                  </div>
                  <div className="rounded-full border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-xs text-emerald-100 backdrop-blur">
                    Live now
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5">
                  <div className="rounded-[1.75rem] border border-white/15 bg-black/40 p-5 text-white backdrop-blur-xl">
                    <p className="font-serif text-2xl leading-tight sm:text-3xl">Beauty journeys that feel curated</p>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/72">
                      Fast discovery, trusted reviews and an experience that feels premium from the first click.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-muted/40 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/60">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Verified salons
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Top rated</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-white/60">Clean booking flow and trusted salon pages with real feedback.</p>
                </div>
                <div className="rounded-3xl border border-border bg-muted/40 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/60">
                    <Users className="h-4 w-4 text-primary" />
                    Client comfort
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">24/7</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-white/60">Favorites, bookings and reviews stay in one place across devices.</p>
                </div>
                <div className="rounded-3xl border border-border bg-muted/40 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/60">
                    <Star className="h-4 w-4 text-amber-500" />
                    Owner tools
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Smart</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-white/60">Salon pages, team workflows and booking visibility without clutter.</p>
                </div>
                <div className="rounded-3xl border border-primary/10 bg-primary/5 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm leading-6 text-slate-700 dark:text-white/70">Start from search if you are a client, or open the owner workspace if you manage a salon.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/auth">
                      <Button size="sm" className="rounded-full px-4">{t("marketplace.nav.login")}</Button>
                    </Link>
                    <Link href="/owner">
                      <Button size="sm" variant="outline" className="rounded-full border-border bg-white text-slate-900 hover:bg-muted dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10">
                        {t("marketplace.nav.registerSalon")}
                      </Button>
                    </Link>
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
