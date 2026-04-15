import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { changeLanguage } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const languages = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
  { code: "uz", name: "UZ" },
];

export function LanguageSwitcher({
  scrolled,
  textClass,
}: {
  scrolled: boolean;
  textClass?: string;
}) {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 px-2 ${scrolled ? "text-foreground" : textClass || "text-white hover:bg-white/20"}`}
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="gap-2"
            data-testid={`button-lang-${lang.code}`}
          >
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HomeNavigation({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkTheme =
    !mounted
      ? true
      : theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const navTextClass = scrolled ? "text-foreground" : isDarkTheme ? "text-white" : "text-slate-950";
  const navMutedTextClass = scrolled
    ? "text-foreground"
    : isDarkTheme
      ? "text-white/90"
      : "text-slate-900";
  const navGhostButtonClass = scrolled
    ? ""
    : isDarkTheme
      ? "text-white hover:bg-white/20"
      : "text-slate-950 hover:bg-primary/10";
  const navPrimaryButtonClass = scrolled
    ? "shadow-sm"
    : isDarkTheme
      ? "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
      : "border border-primary/20 bg-primary/10 text-slate-950 hover:bg-primary/15";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 pt-safe transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
            <span className={`font-serif text-2xl font-semibold tracking-tight ${navTextClass}`}>
              AURELLE
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${navMutedTextClass}`}>
                {t("marketplace.nav.explore")}
              </span>
            </Link>
            <Link href="/search?tab=masters">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${navMutedTextClass}`}>
                {t("home.masters.navLink") || "Мастера"}
              </span>
            </Link>
            <Link href="/about">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${navMutedTextClass}`}>
                {t("about.title")}
              </span>
            </Link>
            <Link href="/owner">
              <span className={`text-sm font-medium transition-colors hover:opacity-80 cursor-pointer ${navMutedTextClass}`}>
                {t("marketplace.nav.forOwners")}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher scrolled={scrolled} textClass={navGhostButtonClass} />
            <Link href="/auth">
              <Button
                variant="ghost"
                className={navGhostButtonClass}
                data-testid="button-login"
              >
                {t("marketplace.nav.login")}
              </Button>
            </Link>
            <Link href="/owner">
              <Button
                className={`rounded-full px-6 transition-all hover:scale-105 active:scale-95 ${navPrimaryButtonClass}`}
                data-testid="button-register-salon"
              >
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher scrolled={scrolled} textClass={navGhostButtonClass} />
            <button
              className="p-2 transition-transform active:scale-90"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label={mobileMenuOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className={navTextClass} /> : <Menu className={navTextClass} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-background border-t border-border animate-in slide-in-from-top duration-300"
        >
          <div className="px-6 py-6 flex flex-col gap-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block font-medium hover:text-primary transition-colors">
                {t("marketplace.nav.explore")}
              </span>
            </Link>
            <Link href="/search?tab=masters" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block font-medium hover:text-primary transition-colors">
                {t("home.masters.navLink") || "Мастера"}
              </span>
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block font-medium hover:text-primary transition-colors">
                {t("about.title")}
              </span>
            </Link>
            <Link href="/owner" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-foreground py-2 block font-medium hover:text-primary transition-colors">
                {t("marketplace.nav.forOwners")}
              </span>
            </Link>
            <div className="pt-4 border-t flex flex-col gap-3">
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  {t("marketplace.nav.login")}
                </Button>
              </Link>
              <Link href="/owner" onClick={() => setMobileMenuOpen(false)}>
                <Button className="rounded-full w-full">
                  {t("marketplace.nav.registerSalon")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
