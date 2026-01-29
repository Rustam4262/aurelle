import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { LocationDisplay } from "@/components/location-display";
import { SalonGallery } from "@/components/image-gallery";
import { getLocalizedText } from "@/lib/i18n";
import type { Salon, WorkingHours } from "@shared/schema";

export function WorkingHoursDisplay({ hours }: { hours: WorkingHours[] }) {
    const { t } = useTranslation();

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const sortedHours = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    return (
        <div className="space-y-2">
            {sortedHours.map((hour) => (
                <div key={hour.id} className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0">
                    <span className="text-foreground font-medium">
                        {t(`marketplace.days.${dayNames[hour.dayOfWeek]}`)}
                    </span>
                    <span className={hour.isClosed ? "text-rose-500" : "text-muted-foreground"}>
                        {hour.isClosed ? t("marketplace.salon.closed") : `${hour.openTime} - ${hour.closeTime}`}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function SalonAbout({
    salon,
    hours,
}: {
    salon: Salon;
    hours: WorkingHours[] | undefined;
}) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const description = getLocalizedText(salon.description as any, currentLang);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-6 space-y-8">
                {description && (
                    <div className="animate-in fade-in duration-700">
                        <h3 className="font-medium text-lg text-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full" />
                            {t("marketplace.salon.about")}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                )}

                <div>
                    <h3 className="font-medium text-lg text-foreground mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        {t("marketplace.salon.location")}
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-muted shadow-sm">
                        <LocationDisplay
                            latitude={Number(salon.latitude)}
                            longitude={Number(salon.longitude)}
                            address={salon.address}
                            salonName={getLocalizedText(salon.name as any, currentLang)}
                        />
                    </div>
                </div>

                {salon.photos && (salon.photos as string[]).length > 0 && (
                    <div>
                        <h3 className="font-medium text-lg text-foreground mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full" />
                            {t("marketplace.salon.gallery")}
                        </h3>
                        <SalonGallery images={salon.photos as string[]} />
                    </div>
                )}

                {hours && hours.length > 0 && (
                    <div className="lg:hidden">
                        <h3 className="font-medium text-lg text-foreground mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full" />
                            {t("marketplace.salon.hours")}
                        </h3>
                        <WorkingHoursDisplay hours={hours} />
                    </div>
                )}
            </Card>
        </div>
    );
}
