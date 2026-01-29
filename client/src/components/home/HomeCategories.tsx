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
            className="py-6 bg-background/80 backdrop-blur-md border-b border-border sticky top-16 z-40 shadow-sm"
            data-testid="section-categories"
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? "default" : "outline"}
                            className={`flex-shrink-0 rounded-full gap-2 transition-all duration-300 ${selectedCategory === category.id
                                    ? "shadow-md scale-105"
                                    : "hover:bg-muted hover:border-primary/50"
                                }`}
                            onClick={() => setSelectedCategory(category.id)}
                            data-testid={`button-category-${category.id}`}
                        >
                            <category.icon className={`h-4 w-4 ${selectedCategory === category.id ? "animate-pulse" : ""}`} />
                            <span className="font-medium">{t(category.labelKey)}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </section>
    );
}
