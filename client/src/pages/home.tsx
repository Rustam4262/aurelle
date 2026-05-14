import { useNavigationScroll } from "@/hooks/use-navigation-scroll";
import { useMarketplaceData } from "@/hooks/use-marketplace-data";
import { HomeSEO } from "@/components/SEO";

// Sub-components
import { HomeNavigation } from "@/components/home/HomeNavigation";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeCategories } from "@/components/home/HomeCategories";
import { HomeSalons } from "@/components/home/HomeSalons";
import { HomeMasters } from "@/components/home/HomeMasters";
import { HomeMap } from "@/components/home/HomeMap";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { HomeFAQ } from "@/components/home/HomeFAQ";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFooter } from "@/components/home/HomeFooter";

export default function Home() {
  const scrolled = useNavigationScroll(50);
  const { salons, isLoading, stats, reviews } = useMarketplaceData();

  return (
    <>
      <HomeSEO />
      <div className="min-h-screen bg-background selection:bg-primary/10">
        <HomeNavigation scrolled={scrolled} />

        <main>
          <HomeHero stats={stats} />
          <HomeCategories />
          <HomeSalons salons={salons} isLoading={isLoading} />
          <HomeMasters />
          <HomeMap salons={salons} />
          <HomeStats stats={stats} />
          <HomeTestimonials stats={stats} reviews={reviews} />
          <HomeFAQ />
          <HomeCTA />
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
