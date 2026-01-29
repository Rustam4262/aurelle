import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Store,
    DollarSign,
    Calendar,
    Star,
    Users,
    Clock,
    User,
    Scissors,
    MessageSquare
} from "lucide-react";
import type { Master, Salon, Review } from "@shared/schema";
import type { EnrichedBooking, MasterStats } from "@/hooks/use-master-data";

interface MasterOverviewProps {
    master: Master;
    salon: Salon;
    bookings: EnrichedBooking[];
    reviews: Review[];
    stats: MasterStats | undefined;
}

export function MasterOverview({ master, salon, bookings, reviews, stats }: MasterOverviewProps) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const getLocalizedText = (obj: any, lang: string) => {
        if (!obj) return "";
        return obj[lang] || obj.en || "";
    };

    const salonName = getLocalizedText(salon?.name, currentLang);

    const todayBookings = bookings?.filter((b) => {
        const bookingDate = new Date(b.bookingDate);
        const today = new Date();
        return bookingDate.toDateString() === today.toDateString() && b.status === "confirmed";
    }) || [];

    const upcomingBookings = bookings?.filter((b) => {
        const bookingDate = new Date(b.bookingDate);
        const today = new Date();
        return bookingDate >= today && b.status === "confirmed";
    }).slice(0, 5) || [];

    return (
        <div className="space-y-6">
            <Card className="p-6 transition-all hover:shadow-md hover:border-primary/20">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-medium text-foreground">{t("marketplace.master.yourSalon")}</h2>
                        <p className="text-lg text-foreground font-serif truncate">{salonName}</p>
                        <p className="text-sm text-muted-foreground">{salon?.city}</p>
                    </div>
                    <Link href={`/salon/${salon?.id}`}>
                        <Button variant="outline" size="sm">
                            {t("marketplace.master.viewSalon")}
                        </Button>
                    </Link>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { icon: DollarSign, color: "text-emerald-500", value: `${stats?.totalEarnings?.toLocaleString() || "0"} UZS`, label: "totalEarnings" },
                    { icon: Calendar, color: "text-primary", value: upcomingBookings.length, label: "upcomingAppointments" },
                    { icon: Star, color: "text-amber-500", value: master.averageRating || "0.0", label: "rating" },
                    { icon: Users, color: "text-blue-500", value: master.reviewCount || 0, label: "clients" }
                ].map((item, idx) => (
                    <Card key={idx} className="p-6 text-center transition-all hover:shadow-md hover:scale-[1.02] duration-300">
                        <item.icon className={`h-8 w-8 ${item.color} mx-auto mb-2`} />
                        <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        <p className="text-sm text-muted-foreground">{t(`marketplace.master.${item.label}`)}</p>
                    </Card>
                ))}
            </div>

            <Card className="p-6">
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5" />
                    {t("marketplace.master.todaysAppointments")}
                </h3>
                {todayBookings.length > 0 ? (
                    <div className="space-y-3">
                        {todayBookings.map((booking) => (
                            <div key={booking.id} className="flex items-start justify-between gap-4 p-5 bg-muted/50 rounded-md">
                                <div className="flex-1 space-y-2.5">
                                    <div className="flex flex-wrap gap-3 items-center">
                                        {booking.client && (
                                            <span className="flex items-center gap-1.5 font-medium text-foreground px-2 py-1 bg-primary/5 rounded-full border border-primary/10">
                                                <User className="h-4 w-4 text-primary" />
                                                {booking.client.firstName} {booking.client.lastName}
                                            </span>
                                        )}
                                        {booking.service && (
                                            <span className="flex items-center gap-1.5 text-muted-foreground px-2 py-1 bg-muted rounded-full">
                                                <Scissors className="h-4 w-4" />
                                                <span>{getLocalizedText(booking.service.name, i18n.language)}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 items-center text-sm">
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            {booking.startTime} - {booking.endTime}
                                        </span>
                                        <Badge variant={booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"}>
                                            {t(`marketplace.booking.status.${booking.status}`)}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-semibold text-foreground text-lg whitespace-nowrap">
                                        {booking.priceSnapshot?.toLocaleString()} UZS
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">{t("marketplace.master.noAppointments")}</p>
                )}
            </Card>

            {reviews && reviews.length > 0 && (
                <Card className="p-6">
                    <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5" />
                        {t("marketplace.master.myReviews")}
                    </h3>
                    <div className="space-y-4">
                        {reviews.slice(0, 3).map((review) => (
                            <div key={review.id} className="p-4 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-foreground">{review.comment}</p>
                                <p className="text-xs text-muted-foreground mt-2">{new Date(review.createdAt!).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
