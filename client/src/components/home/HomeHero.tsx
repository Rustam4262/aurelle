import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";

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
    <section
      // Mobile: items-start + pt-nav keeps content below the fixed nav (64px) AND
      // the device status bar (env(safe-area-inset-top)) on notched phones.
      // sm+: items-center is safe — the hero is tall enough to center without overlap.
      className="relative h-[65vh] min-h-[500px] sm:min-h-[550px] flex items-start sm:items-center justify-center overflow-hidden pt-nav sm:pt-0"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] hover:scale-105"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-0">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-light leading-tight mb-4 md:mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 bg-gradient-to-r from-white via-white to-pink-200 bg-clip-text text-transparent">
          {t("marketplace.hero.title")}
        </h1>
        <p className="text-white/90 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 md:mb-10 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          {t("marketplace.hero.subtitle")}
        </p>

        <form
          onSubmit={handleSearch}
          className="max-w-2xl mx-auto group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
        >
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl hover:shadow-pink-500/20 transition-all group-focus-within:bg-white/20 group-focus-within:border-white/40">
            <div className="flex-1 relative">
              {/* left-4 + pl-12 (48px) keeps the icon from overlapping the input text.
                  pl-13 used previously is NOT in Tailwind's default spacing scale. */}
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 transition-colors group-focus-within:text-white" />
              <Input
                placeholder={t("marketplace.hero.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 sm:h-14 text-base rounded-full bg-white/10 border-0 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white/15"
                data-testid="input-search-hero"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-gradient-to-r from-white to-pink-50 text-black hover:shadow-lg hover:shadow-white/25 hover:scale-105 active:scale-95 transition-all duration-300 font-semibold"
              data-testid="button-search-hero"
            >
              {t("marketplace.hero.search")}
            </Button>
          </div>
        </form>

        <div className="mt-6 md:mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-4 text-white/80 text-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <span className="flex items-center gap-1.5 font-light">
            <MapPin className="h-4 w-4 text-pink-300" />
            {t("marketplace.hero.popularCities")}:
          </span>
          {["Tashkent", "Samarkand", "Bukhara"].map((city) => (
            <button
              key={city}
              onClick={() => navigate(`/search?city=${city.toLowerCase()}`)}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 hover:text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10 font-medium backdrop-blur-sm"
              data-testid={`link-city-${city.toLowerCase()}`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
