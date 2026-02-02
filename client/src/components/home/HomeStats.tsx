import { useTranslation } from "react-i18next";

export function HomeStats() {
  const { t } = useTranslation();

  const stats = [
    { value: "500+", labelKey: "marketplace.stats.salons" },
    { value: "10,000+", labelKey: "marketplace.stats.clients" },
    { value: "50,000+", labelKey: "marketplace.stats.bookings" },
    { value: "12", labelKey: "marketplace.stats.cities" },
  ];

  return (
    <section
      className="py-24 bg-primary text-primary-foreground relative overflow-hidden"
      data-testid="section-stats"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <p className="font-serif text-5xl md:text-6xl font-light mb-4 transition-transform duration-500 group-hover:scale-110 tracking-tighter">
                {stat.value}
              </p>
              <div className="w-10 h-0.5 bg-primary-foreground/30 mx-auto mb-4 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <p className="text-primary-foreground/70 uppercase tracking-widest text-xs font-bold transition-colors group-hover:text-primary-foreground">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
