import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  id: number;
  questionKey: string;
  answerKey: string;
  category: "client" | "salon" | "master";
}

const faqData: FAQItem[] = [
  {
    id: 1,
    category: "client",
    questionKey: "marketplace.home.faq.client.q1",
    answerKey: "marketplace.home.faq.client.a1",
  },
  {
    id: 2,
    category: "client",
    questionKey: "marketplace.home.faq.client.q2",
    answerKey: "marketplace.home.faq.client.a2",
  },
  {
    id: 3,
    category: "salon",
    questionKey: "marketplace.home.faq.salon.q1",
    answerKey: "marketplace.home.faq.salon.a1",
  },
  {
    id: 4,
    category: "salon",
    questionKey: "marketplace.home.faq.salon.q2",
    answerKey: "marketplace.home.faq.salon.a2",
  },
  {
    id: 5,
    category: "master",
    questionKey: "marketplace.home.faq.master.q1",
    answerKey: "marketplace.home.faq.master.a1",
  },
  {
    id: 6,
    category: "client",
    questionKey: "marketplace.home.faq.client.q3",
    answerKey: "marketplace.home.faq.client.a3",
  },
  {
    id: 7,
    category: "salon",
    questionKey: "marketplace.home.faq.salon.q3",
    answerKey: "marketplace.home.faq.salon.a3",
  },
  {
    id: 8,
    category: "master",
    questionKey: "marketplace.home.faq.master.q2",
    answerKey: "marketplace.home.faq.master.a2",
  },
];

export function HomeFAQ() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | "client" | "salon" | "master">(
    "all",
  );

  const toggleAccordion = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredFAQ =
    activeCategory === "all" ? faqData : faqData.filter((item) => item.category === activeCategory);

  const categories = [
    { id: "all", label: t("marketplace.home.faq.categories.all"), icon: "❓" },
    { id: "client", label: t("marketplace.home.faq.categories.client"), icon: "👤" },
    { id: "salon", label: t("marketplace.home.faq.categories.salon"), icon: "💅" },
    { id: "master", label: t("marketplace.home.faq.categories.master"), icon: "✂️" },
  ] as const;

  return (
    <section className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <HelpCircle className="h-4 w-4" />
            {t("marketplace.home.faq.badge")}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-light">
            {t("marketplace.home.faq.title")}
          </h2>
          <p className="text-muted-foreground text-lg font-light">
            {t("marketplace.home.faq.subtitle")}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700">
          {filteredFAQ.map((item, index) => (
            <Card
              key={item.id}
              className={`overflow-hidden transition-all duration-300 border-border/50 ${
                openId === item.id
                  ? "shadow-xl shadow-primary/10 border-primary/30"
                  : "hover:shadow-lg hover:border-primary/20"
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <button
                onClick={() => toggleAccordion(item.id)}
                className="w-full text-left p-6 flex items-center justify-between gap-4 group"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {t(item.questionKey)}
                  </h3>
                </div>
                <div
                  className={`flex-shrink-0 transition-all duration-300 ${
                    openId === item.id ? "rotate-180 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <ChevronDown className="h-5 w-5" />
                </div>
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openId === item.id ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-6 pt-2">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-pink-500 mb-4 rounded-full"></div>
                  <p className="text-muted-foreground leading-relaxed">{t(item.answerKey)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Contact Support CTA */}
        <Card className="mt-12 p-8 text-center bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20">
          <h3 className="font-serif text-2xl text-foreground mb-3 font-light">
            {t("marketplace.home.faq.support.title")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t("marketplace.home.faq.support.description")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@aurelle.uz"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
            >
              📧 support@aurelle.uz
            </a>
            <a
              href="tel:+998932611804"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-background border-2 border-primary/30 text-foreground font-semibold hover:bg-primary/5 transition-all hover:scale-105"
            >
              📞 +998 (93) 261-18-04
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
}
