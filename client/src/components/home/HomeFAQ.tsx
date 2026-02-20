import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: "client" | "salon" | "master";
}

const faqData: FAQItem[] = [
  {
    id: 1,
    category: "client",
    question: "Как записаться к мастеру через AURELLE?",
    answer: "Выберите салон или мастера, просмотрите доступное время в календаре, выберите удобный слот и подтвердите запись. Вы получите уведомление на email и в личном кабинете."
  },
  {
    id: 2,
    category: "client",
    question: "Можно ли отменить или перенести запись?",
    answer: "Да, вы можете отменить или перенести запись в личном кабинете за 24 часа до назначенного времени. При отмене менее чем за 24 часа может взиматься штраф согласно политике салона."
  },
  {
    id: 3,
    category: "salon",
    question: "Сколько стоит размещение салона на платформе?",
    answer: "Регистрация и размещение базовой информации о салоне бесплатны. Мы берем небольшую комиссию только с завершенных записей. Также доступны премиум-тарифы с расширенными функциями."
  },
  {
    id: 4,
    category: "salon",
    question: "Как работает система онлайн-записи?",
    answer: "Вы настраиваете расписание работы, услуги и цены. Клиенты бронируют свободное время онлайн, а вы получаете уведомления. Система автоматически управляет календарем и напоминаниями."
  },
  {
    id: 5,
    category: "master",
    question: "Могу ли я работать как самозанятый мастер?",
    answer: "Да! AURELLE поддерживает solo-мастеров. Создайте свою страницу, укажите услуги и цены, настройте график работы. Вы получите собственную ссылку для клиентов."
  },
  {
    id: 6,
    category: "client",
    question: "Безопасно ли оплачивать услуги через платформу?",
    answer: "Абсолютно безопасно. Мы используем защищенные платежные шлюзы и не храним данные ваших карт. Все транзакции шифруются по стандарту PCI DSS."
  },
  {
    id: 7,
    category: "salon",
    question: "Какую аналитику предоставляет платформа?",
    answer: "Вы получаете подробную статистику: количество просмотров, новые клиенты, популярные услуги, доход по периодам, рейтинг и отзывы. Все данные доступны в реальном времени в личном кабинете."
  },
  {
    id: 8,
    category: "master",
    question: "Как повысить свой рейтинг на платформе?",
    answer: "Качественное обслуживание - главный фактор. Также важны: полнота профиля, быстрые ответы на сообщения, регулярное обновление портфолио, наличие отзывов и соблюдение графика работы."
  }
];

export function HomeFAQ() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | "client" | "salon" | "master">("all");

  const toggleAccordion = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredFAQ = activeCategory === "all"
    ? faqData
    : faqData.filter(item => item.category === activeCategory);

  const categories = [
    { id: "all", label: "Все вопросы", icon: "❓" },
    { id: "client", label: "Для клиентов", icon: "👤" },
    { id: "salon", label: "Для салонов", icon: "💅" },
    { id: "master", label: "Для мастеров", icon: "✂️" },
  ] as const;

  return (
    <section className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <HelpCircle className="h-4 w-4" />
            Часто задаваемые вопросы
          </div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-light">
            Ответы на ваши вопросы
          </h2>
          <p className="text-muted-foreground text-lg font-light">
            Не нашли ответ? Напишите нам в поддержку
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
                animationDelay: `${index * 50}ms`
              }}
            >
              <button
                onClick={() => toggleAccordion(item.id)}
                className="w-full text-left p-6 flex items-center justify-between gap-4 group"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {item.question}
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
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Contact Support CTA */}
        <Card className="mt-12 p-8 text-center bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20">
          <h3 className="font-serif text-2xl text-foreground mb-3 font-light">
            Остались вопросы?
          </h3>
          <p className="text-muted-foreground mb-6">
            Наша служба поддержки работает 24/7 и всегда готова помочь
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@aurelle.uz"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
            >
              📧 support@aurelle.uz
            </a>
            <a
              href="tel:+998123456789"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-background border-2 border-primary/30 text-foreground font-semibold hover:bg-primary/5 transition-all hover:scale-105"
            >
              📞 +998 (12) 345-67-89
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
}
