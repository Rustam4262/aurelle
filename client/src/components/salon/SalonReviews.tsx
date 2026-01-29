import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import type { Review } from "@shared/schema";

export function ReviewCard({ review }: { review: Review }) {
    return (
        <Card className="p-4 transition-all hover:bg-muted/30" data-testid={`card-review-${review.id}`}>
            <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/5 text-primary">U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-500 text-amber-500" : "text-muted"}`}
                                />
                            ))}
                        </div>
                        <span className="text-muted-foreground text-xs">
                            {review.createdAt && new Date(review.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    {review.comment && <p className="text-foreground text-sm leading-relaxed">{review.comment}</p>}
                </div>
            </div>
        </Card>
    );
}

export function SalonReviews({ reviews }: { reviews: Review[] | undefined }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {reviews && reviews.length > 0 ? (
                reviews.map((review) => <ReviewCard key={review.id} review={review} />)
            ) : (
                <Card className="p-8 text-center bg-muted/30">
                    <p className="text-muted-foreground">{t("marketplace.salon.noReviews")}</p>
                </Card>
            )}
        </div>
    );
}
