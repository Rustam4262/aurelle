import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { SearchSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Loader2,
  Filter,
  X,
  MapPin,
  Star,
  SlidersHorizontal,
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

// Service categories for filtering
const SERVICE_CATEGORIES = [
  { id: "hair", labelKey: "Hair Styling", icon: "✂️" },
  { id: "nails", labelKey: "Nails & Manicure", icon: "💅" },
  { id: "makeup", labelKey: "Makeup", icon: "💄" },
  { id: "spa", labelKey: "Spa & Massage", icon: "🧖" },
  { id: "skincare", labelKey: "Skincare", icon: "✨" },
  { id: "barbershop", labelKey: "Barbershop", icon: "💈" },
];

const RATING_OPTIONS = [
  { value: "all", label: "All Ratings" },
  { value: "4", label: "4+ Stars" },
  { value: "3", label: "3+ Stars" },
  { value: "2", label: "2+ Stars" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviewed" },
  { value: "newest", label: "Newest First" },
];

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
  const initialCategory = searchParams.get("category") || "";
  const initialRating = searchParams.get("rating") || "all";
  const initialSort = searchParams.get("sort") || "relevance";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [minRating, setMinRating] = useState(initialRating);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all salons
  const { data: salons = [], isLoading } = useQuery<Salon[]>({
    queryKey: ["/api/salons"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter and sort salons
  const filteredAndSortedSalons = useMemo(() => {
    let filtered = salons.filter((salon) => {
      const salonName = getLocalizedText(salon.name as any, i18n.language);
      const salonCity = getLocalizedText(salon.city as any, i18n.language);
      const salonDesc = getLocalizedText(salon.description as any, i18n.language);
      const queryLower = searchQuery.toLowerCase();

      // Text search
      const textMatch =
        !searchQuery ||
        salonName.toLowerCase().includes(queryLower) ||
        salonDesc.toLowerCase().includes(queryLower);

      // City filter
      const cityMatch =
        !selectedCity ||
        salonCity.toLowerCase().includes(selectedCity.toLowerCase());

      // Category filter (check if salon description mentions the category)
      const categoryMatch =
        !selectedCategory ||
        salonDesc.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        salonName.toLowerCase().includes(selectedCategory.toLowerCase());

      // Rating filter
      const rating = Number(salon.averageRating) || 0;
      const ratingMatch =
        minRating === "all" || rating >= Number(minRating);

      return textMatch && cityMatch && categoryMatch && ratingMatch;
    });

    // Sort results
    if (sortBy === "rating") {
      filtered.sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0));
    } else if (sortBy === "reviews") {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    }

    return filtered;
  }, [salons, searchQuery, selectedCity, selectedCategory, minRating, sortBy, i18n.language]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL();
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCity) params.set("city", selectedCity);
    if (selectedCategory) params.set("category", selectedCategory);
    if (minRating !== "all") params.set("rating", minRating);
    if (sortBy !== "relevance") params.set("sort", sortBy);

    const queryString = params.toString();
    navigate(`/search${queryString ? `?${queryString}` : ""}`);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCity("");
    setSelectedCategory("");
    setMinRating("all");
    setSortBy("relevance");
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
    (searchQuery ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (minRating !== "all" ? 1 : 0);

  return (
    <>
      <SearchSEO />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-gradient-to-r from-background to-primary/5">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-4 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("search.backToHome")}
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-4xl text-foreground mb-2">
                  {t("marketplace.hero.search") || "Search Salons"}
                </h1>
                <p className="text-muted-foreground">
                  {t("search.subtitle")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {t("search.filters")}
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="ml-2 rounded-full px-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className={`lg:block ${showFilters ? "block" : "hidden"}`}>
              <Card className="p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    {t("search.filters")}
                  </h3>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-primary hover:text-primary/80"
                    >
                      {t("search.clearAll")}
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Search Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("search.searchLabel")}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("search.salonNamePlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* City Select */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {t("search.location")}
                    </label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("search.allCities")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("search.allCities")}</SelectItem>
                        {uniqueCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Categories */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      {t("search.serviceCategory")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_CATEGORIES.map((category) => (
                        <button
                          key={category.id}
                          onClick={() =>
                            setSelectedCategory(
                              selectedCategory === category.id ? "" : category.id
                            )
                          }
                          className={`p-3 rounded-lg border-2 transition-all text-left hover:border-primary/50 ${
                            selectedCategory === category.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border"
                          }`}
                        >
                          <div className="text-2xl mb-1">{category.icon}</div>
                          <div className="text-xs font-medium truncate">
                            {category.labelKey}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      {t("search.minRating")}
                    </label>
                    <Select value={minRating} onValueChange={setMinRating}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={updateURL}
                    className="w-full"
                    size="lg"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {t("search.applyFilters")}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-serif text-2xl text-foreground flex items-center gap-3">
                    {isLoading ? (
                      t("search.loading")
                    ) : (
                      <>
                        <span>{t("search.results")}</span>
                        <Badge variant="secondary" className="text-base font-normal">
                          {filteredAndSortedSalons.length}
                        </Badge>
                      </>
                    )}
                  </h2>
                  {activeFiltersCount > 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("search.filterApplied_one", { count: activeFiltersCount })}
                    </p>
                  )}
                </div>

                {/* Sort Dropdown */}
                {filteredAndSortedSalons.length > 0 && (
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Active Filter Tags */}
              {activeFiltersCount > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {searchQuery && (
                    <Badge variant="secondary" className="pl-3 pr-1">
                      {t("search.searchPrefix")} {searchQuery}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-transparent"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {selectedCity && (
                    <Badge variant="secondary" className="pl-3 pr-1">
                      📍 {selectedCity}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-transparent"
                        onClick={() => setSelectedCity("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="pl-3 pr-1">
                      {SERVICE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}{" "}
                      {SERVICE_CATEGORIES.find(c => c.id === selectedCategory)?.labelKey}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-transparent"
                        onClick={() => setSelectedCategory("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {minRating !== "all" && (
                    <Badge variant="secondary" className="pl-3 pr-1">
                      ⭐ {minRating}{t("search.starsLabel")}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-transparent"
                        onClick={() => setMinRating("all")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Results Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {t("common.loading") || "Loading salons..."}
                    </p>
                  </div>
                </div>
              ) : filteredAndSortedSalons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  {filteredAndSortedSalons.map((salon) => (
                    <SalonCard key={salon.id} salon={salon} />
                  ))}
                </div>
              ) : (
                <Card className="p-16 text-center border-dashed">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <h3 className="font-serif text-2xl text-foreground mb-2">
                    {t("search.noSalonsFound")}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t("search.noSalonsDesc")}
                  </p>
                  <Button onClick={handleClearFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    {t("search.clearAllFilters")}
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
