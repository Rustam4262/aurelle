import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="page-backdrop flex min-h-screen w-full items-center justify-center px-4">
      <div className="text-center">
        {/* Oversized outlined "404" with the brand gradient peeking through */}
        <p
          aria-hidden="true"
          className="text-gradient select-none font-serif text-[9rem] font-light leading-none tracking-[-0.04em] sm:text-[13rem] animate-scale-in"
        >
          404
        </p>
        <h1
          className="mt-2 font-serif text-3xl font-light tracking-[-0.01em] text-foreground sm:text-4xl animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          {t("notFound.title")}
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-muted-foreground animate-fade-up"
          style={{ animationDelay: "140ms" }}
        >
          {t("notFound.description")}
        </p>
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <Button asChild size="lg">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              AURELLE
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/search">
              <Search className="h-4 w-4" />
              {t("marketplace.hero.search")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
