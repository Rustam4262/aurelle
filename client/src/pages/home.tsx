import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigationScroll } from "@/hooks/use-navigation-scroll";
import { useMarketplaceData } from "@/hooks/use-marketplace-data";
import { HomeSEO } from "@/components/SEO";
import { PublicDiscoveryLinks } from "@/components/public-document";

// Sub-components
import { HomeNavigation } from "@/components/home/HomeNavigation";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeCategories } from "@/components/home/HomeCategories";
import { HomeSalons } from "@/components/home/HomeSalons";
import { HomeMasters } from "@/components/home/HomeMasters";
import { HomeMap } from "@/components/home/HomeMap";
import { HomeFAQ } from "@/components/home/HomeFAQ";
import { HomeFooter } from "@/components/home/HomeFooter";

export default function Home() {
  const scrolled = useNavigationScroll(50);
  const { salons, isLoading, salonsQuery } = useMarketplaceData();
  const { t } = useTranslation();

  return (
    <>
      <HomeSEO />
      <div className="min-h-screen bg-background selection:bg-primary/10">
        <HomeNavigation scrolled={scrolled} />

        <main>
          <HomeHero />
          <HomeCategories />
          {salonsQuery.isError ? (
            <div role="alert" className="mx-auto max-w-7xl p-8">
              <p>{t("audience.loadError")}</p>
              <Button onClick={() => salonsQuery.refetch()}>{t("audience.retry")}</Button>
            </div>
          ) : (
            <>
              <p className="mx-auto max-w-7xl px-6 pt-6 text-sm text-muted-foreground">
                {t("audience.catalogHint")}
              </p>
              <HomeSalons salons={salons} isLoading={isLoading} />
            </>
          )}
          <HomeMasters />
          <HomeMap salons={salons} />
          <HomeFAQ />
          <PublicDiscoveryLinks />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
