import { useMarketplaceData } from "@/hooks/use-marketplace-data";
import { matchesCategory } from "@shared/service-audience";
import { useLocation } from "wouter";
import { useAudience } from "@/components/audience-provider";
import { useTranslation } from "react-i18next";
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

  const visible = ordered.filter(
    (c) => c.id === "all" || available.some((category) => matchesCategory(category, c.id)),
  );

  // A lone "All" chip adds noise without helping anyone choose — hide the bar then.
  if (visible.length <= 1) return null;

  return (
    <section className="sticky top-[calc(4.6rem+env(safe-area-inset-top,0px))] z-40 px-3 py-3 sm:px-5" data-testid="section-categories">
      <div className="mx-auto max-w-fit overflow-x-auto no-scrollbar rounded-full glass p-1.5 shadow-lg shadow-black/5">
        <div className="flex w-max items-center gap-1">
          {visible.map((category, i) => {
            const active = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                className={`group flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-out-expo animate-fade-up ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-foreground/75 hover:bg-card hover:text-foreground hover:shadow-sm"
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() =>
                  navigate(category.id === "all" ? "/search" : `/search?category=${category.id}`)
                }
                data-testid={`button-category-${category.id}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-12 ${
                    active ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}
                >
                  <category.icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                {t(category.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
