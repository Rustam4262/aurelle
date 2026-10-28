import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function PrivacyPage() {
  const { t } = useTranslation();

  const items = (key: string): string[] => t(key, { returnObjects: true }) as string[];

  const bulletSections: Array<{ key: string; intro?: string; outro?: string; items: string[] }> = [
    { key: "s3", intro: t("privacy.s3.intro"), items: items("privacy.s3.items") },
    { key: "s5", intro: t("privacy.s5.intro"), items: items("privacy.s5.items") },
    { key: "s6", intro: t("privacy.s6.intro"), items: items("privacy.s6.items") },
    {
      key: "s7",
      intro: t("privacy.s7.intro"),
      outro: t("privacy.s7.outro"),
      items: items("privacy.s7.items"),
    },
    { key: "s12", intro: t("privacy.s12.intro"), items: items("privacy.s12.items") },
  ];
  const bulletByKey = Object.fromEntries(bulletSections.map((s) => [s.key, s]));

  const s2Items1 = items("privacy.s2.s1Items");
  const s2Items2 = items("privacy.s2.s2Items");

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
            <h1 className="font-serif text-xl text-foreground ml-4">{t("privacy.pageTitle")}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-glow animate-scale-in">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-serif text-5xl font-light tracking-[-0.02em] text-foreground md:text-6xl animate-fade-up">{t("privacy.pageTitle")}</h2>
            <p className="text-muted-foreground">{t("privacy.lastUpdated")}</p>
          </div>

          {/* Content */}
          <Card className="prose-aurelle space-y-8 [&_h3]:text-3xl [&_h3]:font-light [&_section]:border-b [&_section]:border-foreground/[0.06] [&_section]:pb-8 [&_section:last-child]:border-0">
            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s1.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("privacy.s1.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s2.title")}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">{t("privacy.s2.s1Title")}</h4>
                  <div className="space-y-1 text-muted-foreground leading-relaxed">
                    {s2Items1.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">{t("privacy.s2.s2Title")}</h4>
                  <div className="space-y-1 text-muted-foreground leading-relaxed">
                    {s2Items2.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s3.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>{bulletByKey.s3.intro}</p>
                {bulletByKey.s3.items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s4.title")}</h3>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">{t("privacy.s4.intro")}</p>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">{t("privacy.s4.s1Title")}</h4>
                  <p className="text-muted-foreground leading-relaxed">{t("privacy.s4.s1Body")}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">{t("privacy.s4.s2Title")}</h4>
                  <p className="text-muted-foreground leading-relaxed">{t("privacy.s4.s2Body")}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">{t("privacy.s4.s3Title")}</h4>
                  <p className="text-muted-foreground leading-relaxed">{t("privacy.s4.s3Body")}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s5.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{bulletByKey.s5.intro}</p>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {bulletByKey.s5.items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s6.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>{bulletByKey.s6.intro}</p>
                {bulletByKey.s6.items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s7.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{bulletByKey.s7.intro}</p>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {bulletByKey.s7.items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-3">{bulletByKey.s7.outro}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s8.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("privacy.s8.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s9.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("privacy.s9.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s10.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("privacy.s10.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s11.title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("privacy.s11.body")}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">{t("privacy.s12.title")}</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>{bulletByKey.s12.intro}</p>
                {bulletByKey.s12.items.map((item) => (
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
                {t("privacy.backToHome")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
