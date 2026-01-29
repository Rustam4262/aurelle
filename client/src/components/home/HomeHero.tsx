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
            className="relative h-[65vh] min-h-[550px] flex items-center justify-center overflow-hidden"
            data-testid="section-hero"
        >
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] hover:scale-105"
                style={{ backgroundImage: `url(${heroImage})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
            </div>

            <div className="relative z-10 text-center max-w-4xl mx-auto px-6 animate-in fade-in zoom-in-95 duration-1000">
                <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl text-white font-light leading-tight mb-6 tracking-tight">
                    {t("marketplace.hero.title")}
                </h1>
                <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                    {t("marketplace.hero.subtitle")}
                </p>

                <form onSubmit={handleSearch} className="max-w-2xl mx-auto group">
                    <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-2xl transition-all group-focus-within:bg-white/15">
                        <div className="flex-1 relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                            <Input
                                placeholder={t("marketplace.hero.searchPlaceholder")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-13 h-14 text-base rounded-full bg-white/10 border-0 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                data-testid="input-search-hero"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-14 px-10 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 transition-all font-medium"
                            data-testid="button-search-hero"
                        >
                            {t("marketplace.hero.search")}
                        </Button>
                    </div>
                </form>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/70 text-sm">
                    <span className="flex items-center gap-1.5 opacity-80">
                        <MapPin className="h-4 w-4" />
                        {t("marketplace.hero.popularCities")}:
                    </span>
                    {["Tashkent", "Samarkand", "Bukhara"].map((city) => (
                        <button
                            key={city}
                            onClick={() => navigate(`/search?city=${city.toLowerCase()}`)}
                            className="hover:text-white transition-all hover:translate-y-[-1px] font-medium"
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
