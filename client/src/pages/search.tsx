import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { SearchSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Loader2,
  Filter,
  X,
  MapPin,
} from "lucide-react";
import type { Salon } from "@shared/schema";
import { SalonCard } from "@/components/home/HomeSalons";
import { getLocalizedText } from "@/lib/i18n";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useTranslation as useI18nTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchPage() {
  const { t } = useTranslation();
  const { i18n } = useI18nTranslation();
  const [, navigate] = useLocation();
  const [searchParams] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });

  const initialQuery = searchParams.get("q") || "";
  const initialCity = searchParams.get("city") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch all salons with proper query function
  const { data: salons = [], isLoading } = useQuery<Salon[]>({
    queryKey: ["/api/salons"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter salons based on search criteria
  const filteredSalons = useMemo(() => {
    return salons.filter((salon) => {
      const salonName = getLocalizedText(salon.name as any, i18n.language);
      const salonCity = getLocalizedText(salon.city as any, i18n.language);
      const queryLower = searchQuery.toLowerCase();

      // Check search query match
      const nameMatch = salonName.toLowerCase().includes(queryLower);
      const descriptionMatch =
        getLocalizedText(salon.description as any, i18n.language)
          .toLowerCase()
          .includes(queryLower) || !searchQuery;

      // Check city filter
      const cityMatch =
        !selectedCity ||
        salonCity.toLowerCase().includes(selectedCity.toLowerCase());

      return (nameMatch || descriptionMatch) && cityMatch;
    });
  }, [salons, searchQuery, selectedCity, i18n.language]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCity) params.set("city", selectedCity);
    navigate(`/search?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedCategory("");
    navigate("/search");
  };

  const uniqueCities = Array.from(
    new Set(
      salons
        .map((s) => getLocalizedText(s.city as any, i18n.language))
        .filter(Boolean)
    )
  ).sort();

  const activeFiltersCount =
    (searchQuery ? 1 : 0) + (selectedCity ? 1 : 0) + (selectedCategory ? 1 : 0);

  return (
    <>
      <SearchSEO />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-3xl text-foreground">
            {t("marketplace.hero.search") || "Search"}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Search Form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Query Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("marketplace.hero.searchPlaceholder") || "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* City Filter */}
              <div>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("auth.city") || "Select city"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <Button type="submit" className="w-full">
                <Search className="h-4 w-4 mr-2" />
                {t("marketplace.hero.search") || "Search"}
              </Button>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-sm text-muted-foreground">
                  {activeFiltersCount}{" "}
                  {activeFiltersCount === 1 ? "filter" : "filters"} active
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t("common.loading") || "Loading..."}
              </p>
            </div>
          </div>
        ) : filteredSalons.length > 0 ? (
          <div>
            <div className="mb-6 flex items-center gap-2">
              <h2 className="font-serif text-2xl text-foreground">Results</h2>
              <span className="text-lg text-muted-foreground">
                {filteredSalons.length}{" "}
                {filteredSalons.length === 1 ? "salon" : "salons"} found
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredSalons.map((salon) => (
                <SalonCard key={salon.id} salon={salon} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-serif text-2xl text-foreground mb-2">
              {t("marketplace.salons.noSalons") || "No salons found"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || selectedCity
                ? "Try adjusting your search filters"
                : "Start searching for a salon"}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              {t("marketplace.salons.empty") || "Back to Home"}
            </Button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
