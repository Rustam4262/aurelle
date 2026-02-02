import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./HomeNavigation";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer
      className="bg-card/50 backdrop-blur-sm border-t border-border pt-20 pb-10"
      data-testid="section-footer"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5 space-y-6">
            <Link href="/" className="inline-block group">
              <span className="font-serif text-3xl font-bold tracking-tighter group-hover:text-primary transition-colors">
                AURELLE
              </span>
            </Link>
            <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-sm">
              {t("marketplace.footer.tagline")}
            </p>
            <div className="flex items-center gap-4 pt-4">
              {/* Social placeholders if needed */}
            </div>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              {t("marketplace.footer.forClients")}
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  {t("marketplace.footer.findSalon")}
                </Link>
              </li>
              <li>
                <Link
                  href="/auth"
                  className="text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  {t("marketplace.footer.myBookings")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  {t("about.title")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              {t("marketplace.footer.forOwners")}
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/owner"
                  className="text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  {t("marketplace.footer.registerSalon")}
                </Link>
              </li>
              <li>
                <Link
                  href="/owner"
                  className="text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  {t("marketplace.footer.dashboard")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              Platforma
            </h4>
            <ul className="space-y-4">
              <li>
                <span className="text-muted-foreground font-light italic opacity-50 cursor-not-allowed">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-muted-foreground font-light italic opacity-50 cursor-not-allowed">
                  Privacy Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <p className="text-muted-foreground text-sm font-light">
              &copy; {new Date().getFullYear()} AURELLE. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 scale-90 sm:scale-100">
            <LanguageSwitcher scrolled={true} />
          </div>
        </div>
      </div>
    </footer>
  );
}
