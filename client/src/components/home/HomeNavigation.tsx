import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const { t } = useTranslation();

  // Floating glass pill: transparent at the top, frosted and lifted once the page scrolls.
  const navLinks = [
    { href: "/", label: t("marketplace.nav.explore") },
    { href: "/search?tab=masters", label: t("home.masters.navLink") || "Мастера" },
    { href: "/about", label: t("about.title") },
    { href: "/owner", label: t("marketplace.nav.forOwners") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-safe px-3 sm:px-5">
      <div
        className={`mx-auto mt-3 max-w-6xl rounded-full px-3 pl-5 transition-all duration-500 ease-out-expo ${
          scrolled
            ? "glass shadow-lg shadow-black/10"
            : "border border-transparent bg-transparent"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5" data-testid="link-logo">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary bg-[linear-gradient(135deg,rgb(255_255_255/0.25),rgb(0_0_0/0.15))] font-serif text-lg font-semibold text-white shadow-glow transition-transform duration-500 group-hover:rotate-[-8deg]">
              A
            </span>
            <span className="font-serif text-xl font-semibold tracking-[0.12em] text-foreground">
              AURELLE
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 rounded-full bg-foreground/[0.04] p-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="block cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-foreground/75 transition-all duration-300 hover:bg-card hover:text-foreground hover:shadow-sm">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher scrolled textClass="" />
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="px-4" data-testid="button-login">
                {t("marketplace.nav.login")}
              </Button>
            </Link>
            <Link href="/owner">
              <Button size="sm" className="px-5" data-testid="button-register-salon">
                {t("marketplace.nav.registerSalon")}
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher scrolled textClass="" />
            <button
              className="p-2 transition-transform active:scale-90"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label={
                mobileMenuOpen ? t("marketplace.a11y.closeMenu") : t("marketplace.a11y.openMenu")
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="text-foreground" />
              ) : (
                <Menu className="text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden glass mx-auto mt-2 max-w-6xl rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300"
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
