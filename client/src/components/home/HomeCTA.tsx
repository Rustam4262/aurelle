import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HomeCTA() {
    const { t } = useTranslation();

    return (
        <section className="py-32 bg-background relative overflow-hidden" data-testid="section-cta">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/2 rounded-full blur-[100px] pointer-events-none" />

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
                        <Button size="lg" className="rounded-full px-12 h-16 text-lg shadow-2xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 font-medium" data-testid="button-register-salon-cta">
                            {t("marketplace.cta.registerSalon")}
                        </Button>
                    </Link>
                    <Link href="/auth">
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full px-12 h-16 text-lg border-border/60 hover:border-primary/50 transition-all hover:scale-105 active:scale-95 font-medium bg-background/50 backdrop-blur-md"
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
