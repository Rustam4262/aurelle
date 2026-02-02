import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Image as ImageIcon } from "lucide-react";
import { PortfolioUpload } from "@/components/portfolio-upload";
import { PortfolioGallery } from "@/components/image-gallery";
import type { MasterPortfolio } from "@shared/schema";

interface MasterPortfolioTabProps {
  masterId: string;
  masterName: string | undefined;
  portfolio: MasterPortfolio[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MasterPortfolioTab({
  masterId,
  masterName,
  portfolio,
  isLoading,
  onRefresh,
}: MasterPortfolioTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
            <Plus className="h-5 w-5" />
            {t("marketplace.master.addPhoto")}
          </h3>
          <p className="text-sm text-muted-foreground">Upload your work to showcase your skills</p>
        </div>
        <PortfolioUpload masterId={masterId} maxImages={10} onUploadSuccess={onRefresh} />
      </Card>

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t("marketplace.master.myPortfolio")}
          </h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : portfolio && portfolio.length > 0 ? (
          <PortfolioGallery
            images={portfolio.map((item) => item.imageUrl)}
            masterName={masterName}
          />
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {t("marketplace.master.noPortfolio")}
          </p>
        )}
      </Card>
    </div>
  );
}
