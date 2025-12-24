import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, changeLanguage } from "@/lib/i18n";
import type { Salon } from "@shared/schema";
import {
  Search,
  MapPin,
  Star,
  Clock,
  Phone,
  ChevronRight,
  Globe,
  ChevronDown,
  Menu,
  X,
  Filter,
  Heart,
  Sparkles,
  Scissors,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";

const languages = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
  { code: "uz", name: "UZ" },
];

const categories = [
  { id: "all", icon: Sparkles, labelKey: "marketplace.categories.all" },
  { id: "hair", icon: Scissors, labelKey: "marketplace.categories.hair" },
  { id: "nails", icon: Heart, labelKey: "marketplace.categories.nails" },
  { id: "spa", icon: Sparkles, labelKey: "marketplace.categories.spa" },
  { id: "makeup", icon: Heart, labelKey: "marketplace.categories.makeup" },
];

function LanguageSwitcher({ scrolled }: { scrolled: boolean }) {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 px-2 ${
            scrolled ? "text-foreground" : "text-white hover:bg-white/20"
          }`}
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="gap-2"
            data-testid={`button-lang-${lang.code}`}
          >
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
            <span
              className={`font-serif text-2xl font-semibold tracking-tight ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              BeautyUz
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${
                scrolled ? "text-foreground" : "text-white/90"
              }`}>
                {t("marketplace.nav.explore")}
              </span>
            </Link>
            <Link href="/owner">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${
                scrolled ? "text-foreground" : "text-white/90"
              }`}>
                {t("marketplace.nav.forOwners")}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher scrolled={scrolled} />
            <Link href="/auth">
              <Button
                variant="ghost"
                className={`${
                  scrolled
                    ? ""
                    : "text-white hover:bg-white/20"
                }`}
                data-testid="button-login"
              >
                {t("marketplace.nav.login")}
              </Button>
            </Link>
            <Link href="/owner">
              <Button
                className={`rounded-full px-6 ${
                  scrolled
                    ? ""
                    : "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
                }`}
                data-testid="button-register-salon"
              >
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher scrolled={scrolled} />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={scrolled ? "text-foreground" : "text-white"} />
              ) : (
                <Menu className={scrolled ? "text-foreground" : "text-white"} />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="px-6 py-4 flex flex-col gap-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block">{t("marketplace.nav.explore")}</span>
            </Link>
            <Link href="/owner" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block">{t("marketplace.nav.forOwners")}</span>
            </Link>
            <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full mt-2">
                {t("marketplace.nav.login")}
              </Button>
            </Link>
            <Link href="/owner" onClick={() => setMobileMenuOpen(false)}>
              <Button className="rounded-full w-full">
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
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
      className="relative h-[60vh] min-h-[500px] flex items-center justify-center"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white font-light leading-tight mb-4">
          {t("marketplace.hero.title")}
        </h1>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
          {t("marketplace.hero.subtitle")}
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("marketplace.hero.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base rounded-full bg-white/95 backdrop-blur-md border-0"
                data-testid="input-search-hero"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-14 px-8 rounded-full"
              data-testid="button-search-hero"
            >
              {t("marketplace.hero.search")}
            </Button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-white/70 text-sm">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {t("marketplace.hero.popularCities")}:
          </span>
          <button 
            onClick={() => navigate("/search?city=tashkent")} 
            className="hover:text-white transition-colors"
            data-testid="link-city-tashkent"
          >
            Tashkent
          </button>
          <button 
            onClick={() => navigate("/search?city=samarkand")} 
            className="hover:text-white transition-colors"
            data-testid="link-city-samarkand"
          >
            Samarkand
          </button>
          <button 
            onClick={() => navigate("/search?city=bukhara")} 
            className="hover:text-white transition-colors"
            data-testid="link-city-bukhara"
          >
            Bukhara
          </button>
        </div>
      </div>
    </section>
  );
}

function CategorySection() {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <section className="py-8 bg-background border-b border-border sticky top-16 z-40" data-testid="section-categories">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              className={`flex-shrink-0 rounded-full gap-2 ${
                selectedCategory === category.id ? "" : "hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory(category.id)}
              data-testid={`button-category-${category.id}`}
            >
              <category.icon className="h-4 w-4" />
              {t(category.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function SalonCard({ salon }: { salon: Salon }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(salon.name as any, currentLang);
  const description = getLocalizedText(salon.description as any, currentLang);
  const city = getLocalizedText(salon.city as any, currentLang);

  return (
    <Link href={`/salon/${salon.id}`}>
      <Card className="group overflow-hidden hover-elevate cursor-pointer" data-testid={`card-salon-${salon.id}`}>
        <div className="aspect-[4/3] relative overflow-hidden">
          {salon.photos && (salon.photos as string[])[0] ? (
            <img
              src={(salon.photos as string[])[0]}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Scissors className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Button 
              size="icon" 
              variant="ghost" 
              className="bg-white/80 backdrop-blur-sm hover:bg-white"
              onClick={(e) => { e.preventDefault(); }}
              data-testid={`button-favorite-${salon.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          {salon.averageRating && Number(salon.averageRating) > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                {Number(salon.averageRating).toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-serif text-lg text-foreground mb-1 line-clamp-1">
            {name || "Unnamed Salon"}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1">{city || "Unknown Location"}</span>
          </div>
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {salon.reviewCount || 0} {t("marketplace.salon.reviews")}
            </span>
            <Button variant="ghost" size="sm" className="text-primary p-0 h-auto">
              {t("marketplace.salon.viewDetails")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SalonsSection() {
  const { t, i18n } = useTranslation();

  const { data: salons, isLoading } = useQuery<Salon[]>({
    queryKey: ["/api/salons"],
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background" data-testid="section-salons">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-3xl text-foreground mb-2">
                {t("marketplace.salons.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("marketplace.salons.subtitle")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displaySalons = salons && salons.length > 0 ? salons : [];

  return (
    <section className="py-16 bg-background" data-testid="section-salons">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-2">
              {t("marketplace.salons.title")}
            </h2>
            <p className="text-muted-foreground">
              {displaySalons.length > 0 
                ? t("marketplace.salons.subtitle") 
                : t("marketplace.salons.empty")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-sort-rating">
              {t("marketplace.salons.sortRating")}
            </Button>
          </div>
        </div>

        {displaySalons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displaySalons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.salons.noSalons")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("marketplace.salons.beFirst")}
            </p>
            <Link href="/owner">
              <Button className="rounded-full" data-testid="button-register-salon-empty">
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </section>
  );
}

function MapSection() {
  const { t } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Yandex Maps API
    const script = document.createElement("script");
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=en_US`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <section className="py-16 bg-card" data-testid="section-map">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl text-foreground mb-2">
            {t("marketplace.map.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("marketplace.map.subtitle")}
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="h-[400px] bg-muted relative" data-testid="map-container">
            {/* Map placeholder - in production, integrate Yandex Maps properly with API key */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {t("marketplace.map.loading")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("marketplace.map.apiNote")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function StatsSection() {
  const { t } = useTranslation();

  const stats = [
    { value: "500+", labelKey: "marketplace.stats.salons" },
    { value: "10,000+", labelKey: "marketplace.stats.clients" },
    { value: "50,000+", labelKey: "marketplace.stats.bookings" },
    { value: "12", labelKey: "marketplace.stats.cities" },
  ];

  return (
    <section className="py-16 bg-primary text-primary-foreground" data-testid="section-stats">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="font-serif text-4xl md:text-5xl font-light mb-2">
                {stat.value}
              </p>
              <p className="text-primary-foreground/80">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-background" data-testid="section-cta">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
          {t("marketplace.cta.title")}
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
          {t("marketplace.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/owner">
            <Button size="lg" className="rounded-full px-8" data-testid="button-register-salon-cta">
              {t("marketplace.cta.registerSalon")}
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline" className="rounded-full px-8" data-testid="button-join-client-cta">
              {t("marketplace.cta.joinClient")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-card border-t border-border py-12" data-testid="section-footer">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="font-serif text-2xl font-semibold text-foreground">
              BeautyUz
            </span>
            <p className="text-muted-foreground mt-3 max-w-sm">
              {t("marketplace.footer.tagline")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-4">
              {t("marketplace.footer.forClients")}
            </h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t("marketplace.footer.findSalon")}
                </Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-foreground transition-colors">
                  {t("marketplace.footer.myBookings")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-4">
              {t("marketplace.footer.forOwners")}
            </h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/owner" className="hover:text-foreground transition-colors">
                  {t("marketplace.footer.registerSalon")}
                </Link>
              </li>
              <li>
                <Link href="/owner" className="hover:text-foreground transition-colors">
                  {t("marketplace.footer.dashboard")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {t("marketplace.footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher scrolled={true} />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation scrolled={scrolled} />
      <HeroSection />
      <CategorySection />
      <SalonsSection />
      <MapSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
