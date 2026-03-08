import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sparkles, Scissors, Heart } from "lucide-react";

export const categories = [
  { id: "all", icon: Sparkles, labelKey: "marketplace.categories.all" },
  { id: "hair", icon: Scissors, labelKey: "marketplace.categories.hair" },
  { id: "nails", icon: Heart, labelKey: "marketplace.categories.nails" },
  { id: "spa", icon: Sparkles, labelKey: "marketplace.categories.spa" },
  { id: "makeup", icon: Heart, labelKey: "marketplace.categories.makeup" },
];

export function HomeCategories() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");

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
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className={`flex-shrink-0 rounded-full gap-1.5 transition-all duration-300 ${
                  selectedCategory === category.id
                    ? "shadow-md scale-105"
                    : "hover:bg-muted hover:border-primary/50"
                }`}
                onClick={() => setSelectedCategory(category.id)}
                data-testid={`button-category-${category.id}`}
              >
                <category.icon
                  className={`h-3.5 w-3.5 ${selectedCategory === category.id ? "animate-pulse" : ""}`}
                />
                <span className="font-medium">{t(category.labelKey)}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
