import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowLeft, Star, MapPin, Share2, Heart, CheckCircle, Scissors } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";

export function SalonHeader({ salon }: { salon: Salon }) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const name = getLocalizedText(salon.name as any, currentLang);
    const city = getLocalizedText(salon.city as any, currentLang);

    return (
        <div className="relative">
            <div className="h-64 md:h-80 overflow-hidden">
                {salon.photos && (salon.photos as string[])[0] ? (
                    <img
                        src={(salon.photos as string[])[0]}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Scissors className="h-24 w-24 text-muted-foreground" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <Link href="/">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all hover:scale-105"
                        data-testid="button-back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex gap-2">
                    <LanguageSwitcher
                        variant="ghost"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white text-foreground"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all hover:scale-105"
                        data-testid="button-share"
                    >
                        <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all hover:scale-105 text-rose-500 hover:text-rose-600"
                        data-testid="button-favorite"
                    >
                        <Heart className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-white/90 text-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("marketplace.salon.verified")}
                        </Badge>
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl font-light mb-2">
                        {name || "Unnamed Salon"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-white/90">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{city}</span>
                        </div>
                        {salon.averageRating && Number(salon.averageRating) > 0 && (
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{Number(salon.averageRating).toFixed(1)}</span>
                                <span className="text-white/70">
                                    ({salon.reviewCount || 0} {t("marketplace.salon.reviews")})
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
