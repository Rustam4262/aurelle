import { goBackOrNavigate } from "@/lib/safe-back";
import { matchesCategory } from "@shared/service-audience";
import { useAudience } from "@/components/audience-provider";
import { SymbolIcon } from "@/components/ui/symbol-icon";
import { useLocation, useSearch } from "wouter";
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
  User,
} from "lucide-react";
import type { Salon } from "@shared/schema";
import { cityMatchesKey } from "@shared/city-aliases";
import { SalonCard } from "@/components/home/HomeSalons";
import { getLocalizedText } from "@/lib/i18n";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useState, useMemo, useEffect } from "react";
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
  { id: "hair", labelKey: "marketplace.categories.hair", icon: "hair" },
  { id: "nails", labelKey: "marketplace.categories.nails", icon: "nails" },
  { id: "makeup", labelKey: "marketplace.categories.makeup", icon: "makeup" },
  { id: "spa", labelKey: "marketplace.categories.spa", icon: "spa" },
  { id: "skincare", labelKey: "marketplace.categories.skincare", icon: "recommended" },
  { id: "barbershop", labelKey: "marketplace.categories.barbershop", icon: "barbershop" },
];

const RATING_OPTIONS = [
  { value: "all", labelKey: "search.ratingAll" },
  { value: "4", labelKey: "search.rating4Plus" },
  { value: "3", labelKey: "search.rating3Plus" },
  { value: "2", labelKey: "search.rating2Plus" },
];

const SORT_OPTIONS = [
  { value: "relevance", labelKey: "search.sortRelevance" },
  { value: "rating", labelKey: "search.sortRatingHighest" },
  { value: "reviews", labelKey: "search.sortMostReviewed" },
  { value: "newest", labelKey: "search.sortNewest" },
];

type SearchTab = "salons" | "masters";

interface PublicMaster {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  city: string | null;
  address: string | null;
  serviceMode: string | null;
  specialties: { en: string[]; ru: string[]; uz: string[] } | null;
  averageRating: string | null;
  reviewCount: number | null;
  experience: number | null;
  instagram: string | null;
  telegram: string | null;
}

function MasterCard({ master }: { master: PublicMaster }) {
  const [, navigate] = useLocation();
  const { t, i18n } = useI18nTranslation();
  const lang = i18n.language as "en" | "ru" | "uz";

  const specialties = master.specialties?.[lang] ?? master.specialties?.ru ?? [];
  const rating = parseFloat(master.averageRating || "0");

  const serviceModeLabel =
    master.serviceMode === "mobile"
      ? t("master.serviceMode.mobile")
      : master.serviceMode === "both"
        ? t("master.serviceMode.both")
        : t("master.serviceMode.atMaster");

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/master/${master.slug}`)}
    >
      <div className="relative h-40 bg-muted flex items-center justify-center">
        {master.photo ? (
          <img src={master.photo} alt={master.name} className="w-full h-full object-cover" />
        ) : (
          <User className="h-16 w-16 text-muted-foreground opacity-40" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">{master.name}</h3>
        {master.city && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {master.city}
          </p>
        )}
        {specialties.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {specialties.slice(0, 3).join(", ")}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium">{rating > 0 ? rating.toFixed(1) : "—"}</span>
            {(master.reviewCount ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">({master.reviewCount})</span>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {serviceModeLabel}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

export default function SearchPage() {
  const { audience } = useAudience();
  const { t } = useTranslation();
  const { i18n } = useI18nTranslation();
  const [, navigate] = useLocation();
  const urlSearch = useSearch();
  const searchParams = new URLSearchParams(urlSearch);

  const audienceParam = searchParams.get("audience");
  const catalogAudience =
    audienceParam === "all" || audienceParam === "women" || audienceParam === "men"
      ? audienceParam
      : audience;

  const initialQuery = searchParams.get("q") || "";
  const initialCity = searchParams.get("city") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialRating = searchParams.get("rating") || "all";
  const initialSort = searchParams.get("sort") || "relevance";
  const initialTab = (searchParams.get("tab") as SearchTab) || "salons";

  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [minRating, setMinRating] = useState(initialRating);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all salons
  const {
    data: salons = [],
    isLoading: salonsLoading,
    isError: salonsError,
    refetch: refetchSalons,
  } = useQuery<(Salon & { serviceCategories: string[]; serviceNames: string })[]>({
    queryKey: ["/api/salons", { audience: catalogAudience }],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch solo masters (only when masters tab is active)
  const {
    data: mastersList = [],
    isLoading: mastersLoading,
    isError: mastersError,
    refetch: refetchMasters,
  } = useQuery<PublicMaster[]>({
    queryKey: ["/api/masters", searchQuery, selectedCity, audience, searchParams.get("audience")],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/masters?${new URLSearchParams({
          ...(searchQuery ? { q: searchQuery } : {}),
          ...(selectedCity ? { city: selectedCity } : {}),
          limit: "60",
          audience: catalogAudience,
        })}`,
      ).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === "masters",
  });

  useEffect(() => {
    const params = new URLSearchParams(urlSearch);
    setActiveTab(params.get("tab") === "masters" ? "masters" : "salons");
    setSearchQuery(params.get("q") || "");
    setSelectedCity(params.get("city") || "");
    setSelectedCategory(params.get("category") || "");
    setMinRating(params.get("rating") || "all");
    setSortBy(params.get("sort") || "relevance");
  }, [urlSearch]);

  const isLoading = activeTab === "salons" ? salonsLoading : mastersLoading;

  // Filter and sort salons
  const filteredAndSortedSalons = useMemo(() => {
    const filtered = salons.filter((salon) => {
      type L10n = { en?: string; ru?: string; uz?: string };
      const salonName = getLocalizedText(salon.name as unknown as L10n, i18n.language);
      const salonCity = salon.city ?? "";
      const salonDesc = getLocalizedText(salon.description as unknown as L10n, i18n.language);
      const queryLower = searchQuery.toLowerCase();

      // Text search
      const textMatch =
        !searchQuery ||
        salonName.toLowerCase().includes(queryLower) ||
        salonDesc.toLowerCase().includes(queryLower) ||
        (salon.serviceNames || "").toLowerCase().includes(queryLower);

      // City filter — plain substring match for free-typed city names, plus
      // alias matching so the homepage's city chips (one fixed spelling)
      // still find listings stored in a different script.
      const cityMatch =
        !selectedCity ||
        salonCity.toLowerCase().includes(selectedCity.toLowerCase()) ||
        cityMatchesKey(salonCity, selectedCity);

      // Filter against the actual active services returned for this audience.
      const categoryMatch =
        !selectedCategory ||
        (salon.serviceCategories || []).some((category) =>
          matchesCategory(category, selectedCategory),
        );
      const rating = Number(salon.averageRating) || 0;
      return (
        textMatch &&
        cityMatch &&
        categoryMatch &&
        (minRating === "all" || rating >= Number(minRating))
      );
    });
    if (sortBy === "rating") {
      filtered.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    } else if (sortBy === "reviews") {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sortBy === "newest") {
      const time = (value: Salon["createdAt"]) => {
        const n = value ? new Date(value).getTime() : 0;
        return Number.isFinite(n) ? n : 0;
      };
      filtered.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    }
    return filtered;
  }, [salons, searchQuery, selectedCity, selectedCategory, minRating, sortBy, i18n.language]);

  const filteredMasters = useMemo(() => {
    const filtered = mastersList.filter(
      (master) => minRating === "all" || Number(master.averageRating || 0) >= Number(minRating),
    );
    if (sortBy === "rating" || sortBy === "relevance") {
      filtered.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    } else if (sortBy === "reviews") {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }
    return filtered;
  }, [mastersList, minRating, sortBy]);

  const updateURL = () => {
    const params = new URLSearchParams();
    params.set("audience", catalogAudience);
    if (activeTab !== "salons") params.set("tab", activeTab);
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
    navigate(`/search?audience=all${activeTab === "masters" ? "&tab=masters" : ""}`);
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set("audience", catalogAudience);
    if (selectedCategory) params.set("category", selectedCategory);
    if (minRating !== "all") params.set("rating", minRating);
    if (sortBy !== "relevance") params.set("sort", sortBy);
    if (tab !== "salons") params.set("tab", tab);
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCity) params.set("city", selectedCity);
    const qs = params.toString();
    navigate(`/search${qs ? `?${qs}` : ""}`);
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedCategory && activeTab === "salons" ? 1 : 0) +
    (minRating !== "all" ? 1 : 0);

  const resultCount =
    activeTab === "salons" ? filteredAndSortedSalons.length : filteredMasters.length;

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
              onClick={() => goBackOrNavigate(navigate, "/")}
              className="mb-4 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("search.backToHome")}
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              {(["all", "women", "men"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={catalogAudience === value ? "default" : "outline"}
                  aria-pressed={catalogAudience === value}
                  onClick={() => {
                    const params = new URLSearchParams(urlSearch);
                    params.set("audience", value);
                    navigate("/search?" + params.toString());
                  }}
                >
                  {t(value === "all" ? "audience.catalog" : "audience." + value)}
                </Button>
              ))}
            </div>
            <p className="my-4 text-sm text-muted-foreground">{t("audience.catalogHint")}</p>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-4xl text-foreground mb-2">
                  {activeTab === "masters"
                    ? t("search.mastersTitle") || "Мастера"
                    : t("marketplace.hero.search") || "Search Salons"}
                </h1>
                <p className="text-muted-foreground">{t("search.subtitle")}</p>
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

            {/* Tab switcher */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={activeTab === "salons" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange("salons")}
              >
                {t("search.tabSalons") || "Салоны"}
              </Button>
              <Button
                variant={activeTab === "masters" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange("masters")}
              >
                {t("search.tabMasters") || "Мастера"}
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
                        placeholder={
                          activeTab === "masters"
                            ? t("search.masterNamePlaceholder") || "Имя мастера..."
                            : t("search.salonNamePlaceholder")
                        }
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
                    <Input
                      placeholder={t("search.allCities")}
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    />
                  </div>

                  {/* Service Categories — salons only */}
                  {activeTab === "salons" && (
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
                                selectedCategory === category.id ? "" : category.id,
                              )
                            }
                            className={`p-3 rounded-lg border-2 transition-all text-left hover:border-primary/50 ${
                              selectedCategory === category.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border"
                            }`}
                          >
                            <SymbolIcon name={category.id} className="mb-2 h-5 w-5" />
                            <div className="text-xs font-medium truncate">
                              {t(category.labelKey)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Apply Button */}
                  <Button onClick={updateURL} className="w-full" size="lg">
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
                          {resultCount}
                        </Badge>
                      </>
                    )}
                  </h2>
                  {activeFiltersCount > 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("search.filterApplied", { count: activeFiltersCount })}
                    </p>
                  )}
                </div>

                {/* Sort Dropdown */}
                {resultCount > 0 && (
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
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
                      <SymbolIcon name="location" className="mr-1 h-4 w-4" /> {selectedCity}
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
                  {selectedCategory && activeTab === "salons" && (
                    <Badge variant="secondary" className="pl-3 pr-1">
                      <SymbolIcon name={selectedCategory} className="mr-1 h-4 w-4" />{" "}
                      {(() => {
                        const key = SERVICE_CATEGORIES.find(
                          (c) => c.id === selectedCategory,
                        )?.labelKey;
                        return key ? t(key) : null;
                      })()}
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
                      ⭐ {minRating}
                      {t("search.starsLabel")}
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
              {(activeTab === "salons" ? salonsError : mastersError) ? (
                <div role="alert" className="rounded-xl border p-6">
                  <p>{t("audience.loadError")}</p>
                  <Button
                    onClick={() => (activeTab === "salons" ? refetchSalons() : refetchMasters())}
                  >
                    {t("audience.retry")}
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {t("common.loading") || "Загрузка..."}
                    </p>
                  </div>
                </div>
              ) : activeTab === "salons" ? (
                filteredAndSortedSalons.length > 0 ? (
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
                )
              ) : filteredMasters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  {filteredMasters.map((master) => (
                    <MasterCard key={master.id} master={master} />
                  ))}
                </div>
              ) : (
                <Card className="p-16 text-center border-dashed">
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <h3 className="font-serif text-2xl text-foreground mb-2">
                    {t("search.noMastersFound")}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t("search.noMastersDesc")}
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
