import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function TermsPage() {
  const { t } = useTranslation();
  const items = (key: string): string[] => t(key, { returnObjects: true }) as string[];

  const s3Items = items("terms.s3.items");
  const s4Items = items("terms.s4.items");
  const s5Items = items("terms.s5.items");
  const s6Items = items("terms.s6.items");
  const s11Items = items("terms.s11.items");

  return (
    <div className="page-backdrop min-h-screen">
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="cabinet-topbar flex max-w-4xl items-center justify-between gap-4 px-3 py-2.5">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="outline" size="icon" aria-label="AURELLE">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">{t("terms.pageTitle")}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-glow animate-scale-in">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-serif text-5xl font-light tracking-[-0.02em] text-foreground md:text-6xl animate-fade-up">{t("terms.pageTitle")}</h2>
            <p className="text-muted-foreground">{t("terms.lastUpdated")}</p>
          </div>

          {/* Content */}
          <Card className="prose-aurelle space-y-8 [&_h3]:text-3xl [&_h3]:font-light [&_section]:border-b [&_section]:border-foreground/[0.06] [&_section]:pb-8 [&_section:last-child]:border-0">
            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s1.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s1.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s2.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s2.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s3.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {s3Items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s4.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {s4Items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s5.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {s5Items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s6.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>{t("terms.s6.intro")}</p>
                {s6Items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s7.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s7.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s8.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s8.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s9.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s9.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s10.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("terms.s10.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("terms.s11.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>{t("terms.s11.intro")}</p>
                {s11Items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>
          </Card>

          {/* Back button */}
          <div className="text-center">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("terms.backToHome")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
