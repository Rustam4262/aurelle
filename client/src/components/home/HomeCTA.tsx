import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HomeCTA() {
  const { t } = useTranslation();

  return (
    <section className="py-32 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden" data-testid="section-cta">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        <div className="inline-block p-1 px-4 bg-primary/5 rounded-full text-primary text-xs font-bold uppercase tracking-widest mb-8 border border-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
          Присоединяйтесь к нам
        </div>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-7xl text-foreground mb-8 font-light leading-tight animate-in fade-in slide-in-from-bottom duration-700 delay-100 tracking-tight">
          {t("marketplace.cta.title")}
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl mb-14 max-w-2xl mx-auto font-light leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
          {t("marketplace.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
          <Link href="/owner">
            <Button
              size="lg"
              className="rounded-full px-12 h-16 text-lg bg-gradient-to-r from-primary via-pink-600 to-purple-600 hover:from-primary/90 hover:via-pink-600/90 hover:to-purple-600/90 shadow-2xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 active:scale-95 font-semibold relative group overflow-hidden"
              data-testid="button-register-salon-cta"
            >
              <span className="relative z-10">{t("marketplace.cta.registerSalon")}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
          </Link>
          <Link href="/auth">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-12 h-16 text-lg border-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 hover:scale-105 active:scale-95 font-semibold bg-background/80 backdrop-blur-md"
              data-testid="button-join-client-cta"
            >
              {t("marketplace.cta.joinClient")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
