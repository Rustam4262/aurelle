import { useMarketplaceData } from "@/hooks/use-marketplace-data";
import { matchesCategory } from "@shared/service-audience";
import { useLocation } from "wouter";
import { useAudience } from "@/components/audience-provider";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Scissors, Paintbrush, Flower2, Brush } from "lucide-react";

export const categories = [
  { id: "all", icon: LayoutGrid, labelKey: "marketplace.categories.all" },
  { id: "hair", icon: Scissors, labelKey: "marketplace.categories.hair" },
  { id: "nails", icon: Paintbrush, labelKey: "marketplace.categories.nails" },
  { id: "spa", icon: Flower2, labelKey: "marketplace.categories.spa" },
  { id: "barbershop", icon: Scissors, labelKey: "marketplace.categories.barbershop" },
  { id: "skincare", icon: Flower2, labelKey: "marketplace.categories.skincare" },
  { id: "makeup", icon: Brush, labelKey: "marketplace.categories.makeup" },
];

export function HomeCategories() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { audience } = useAudience();
  const selectedCategory = "all";
  const { salons } = useMarketplaceData();
  const available = salons.flatMap(
    (s) => (s as typeof s & { serviceCategories?: string[] }).serviceCategories || [],
  );
  const ordered =
    audience === "men"
      ? categories
          .filter((c) => c.id !== "makeup")
          .sort(
            (a, b) =>
              ["all", "hair", "barbershop", "skincare", "spa", "nails"].indexOf(a.id) -
              ["all", "hair", "barbershop", "skincare", "spa", "nails"].indexOf(b.id),
          )
      : categories;

  return (
    <section
      className="py-4 sm:py-6 bg-background/80 backdrop-blur-md border-b border-border sticky top-nav z-40 shadow-sm"
      data-testid="section-categories"
    >
      <div className="max-w-7xl mx-auto">
        {/*
         * The scroll container spans the full viewport width (no px on max-w wrapper).
         * no-scrollbar hides the scrollbar (defined in index.css @layer utilities).
         * Inner flex row uses px-4 sm:px-6 for edge breathing room and w-max to
         * prevent wrapping — this gives clean horizontal scroll on mobile.
         */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 w-max pb-1">
            {ordered
              .filter(
                (c) =>
                  c.id === "all" || available.some((category) => matchesCategory(category, c.id)),
              )
              .map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={`flex-shrink-0 rounded-full gap-1.5 transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "shadow-md scale-105"
                      : "hover:bg-muted hover:border-primary/50"
                  }`}
                  onClick={() =>
                    navigate(category.id === "all" ? "/search" : `/search?category=${category.id}`)
                  }
                  data-testid={`button-category-${category.id}`}
                >
                  <category.icon className="h-4 w-4" strokeWidth={1.75} />
                  <span className="font-medium">{t(category.labelKey)}</span>
                </Button>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
