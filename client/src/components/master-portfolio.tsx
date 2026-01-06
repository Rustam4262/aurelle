import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Image } from "lucide-react";

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title?: { en: string; ru: string; uz: string };
  description?: { en: string; ru: string; uz: string };
  serviceCategory?: string;
}

interface MasterPortfolioProps {
  masterId: string;
}

export function MasterPortfolio({ masterId }: MasterPortfolioProps) {
  const { t, i18n } = useTranslation();

  const { data: portfolioItems, isLoading } = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio/master", masterId],
    queryFn: async () => {
      return apiRequest("GET", `/api/portfolio/master/${masterId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!portfolioItems || portfolioItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{t("portfolio.noItems")}</p>
        </CardContent>
      </Card>
    );
  }

  const currentLang = i18n.language as "en" | "ru" | "uz";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {portfolioItems.map((item) => (
        <Card key={item.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
          <div className="aspect-square relative">
            <img
              src={item.imageUrl}
              alt={item.title?.[currentLang] || "Portfolio item"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {item.serviceCategory && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-white/90">
                  {item.serviceCategory}
                </Badge>
              </div>
            )}
          </div>
          {(item.title || item.description) && (
            <CardContent className="p-3">
              {item.title && (
                <p className="font-medium text-sm line-clamp-1">
                  {item.title[currentLang]}
                </p>
              )}
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {item.description[currentLang]}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
