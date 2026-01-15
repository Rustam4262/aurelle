import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { PortfolioGallery } from "@/components/image-gallery";
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
  masterName?: string;
}

export function MasterPortfolio({ masterId, masterName }: MasterPortfolioProps) {
  const { t } = useTranslation();

  const { data: portfolioItems, isLoading } = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio/master", masterId],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

  // Extract image URLs from portfolio items
  const portfolioImages = portfolioItems.map((item) => item.imageUrl);

  return <PortfolioGallery images={portfolioImages} masterName={masterName} />;
}
