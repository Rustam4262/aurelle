import { MessengerLink } from "@/components/messenger-link";
import { BackButton } from "@/components/back-button";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Star, MapPin, Share2, Heart, CheckCircle, Scissors } from "lucide-react";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon } from "@shared/schema";

export function SalonHeader({ salon }: { salon: Salon }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const name = getLocalizedText(
    salon.name as { en?: string; ru?: string; uz?: string },
    currentLang,
  );
  const city = salon.city ?? "";

  return (
    // Inset, rounded cover with a frosted toolbar and an editorial title block
    <div className="px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] shadow-2xl">
        <div className="h-[22rem] md:h-[28rem]">
          {salon.photos && (salon.photos as string[])[0] ? (
            <img
              src={(salon.photos as string[])[0]}
              alt={name}
              className="h-full w-full object-cover animate-scale-in"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(90%_80%_at_15%_10%,hsl(var(--primary)/0.55),transparent_60%),radial-gradient(80%_70%_at_90%_90%,hsl(15_90%_62%/0.45),transparent_60%)] bg-[hsl(330_16%_10%)]">
              <div className="absolute inset-0 bg-dots opacity-60" />
              <span className="font-serif text-[9rem] font-light leading-none text-white/15 animate-float-slow">
                {(name || "A").charAt(0)}
              </span>
              <Scissors className="absolute right-10 top-24 h-10 w-10 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
        </div>

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <BackButton
            fallback="/search"
            className="rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
          />
          <div className="flex gap-2 rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur-md">
            <MessengerLink compact recipientId={salon.ownerId} />
            <LanguageSwitcher
              variant="ghost"
              className="rounded-full text-white hover:bg-white/15"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15"
              aria-label="share"
              data-testid="button-share"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:text-rose-500"
              aria-label="favorite"
              data-testid="button-favorite"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-10">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-md">
              <CheckCircle className="h-3.5 w-3.5" />
              {t("marketplace.salon.verified")}
            </span>
            <h1 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-[-0.02em] md:text-6xl">
              {name || t("marketplace.salon.unnamed")}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-md">
                <MapPin className="h-4 w-4" />
                {city}
              </span>
              {salon.averageRating && Number(salon.averageRating) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-md">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <b>{Number(salon.averageRating).toFixed(1)}</b>
                  <span className="text-white/70">
                    · {salon.reviewCount || 0} {t("marketplace.salon.reviews")}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
