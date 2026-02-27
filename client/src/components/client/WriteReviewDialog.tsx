import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Star, Scissors, User, Calendar, Loader2 } from "lucide-react";
import type { EnrichedBooking } from "./types";
import { useState, useEffect } from "react";

type LocalizedText = { en?: string; ru?: string; uz?: string };

function getLocalizedText(obj: LocalizedText | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: EnrichedBooking | null;
  onSubmit: (data: { rating: number; comment: string }) => void;
  isPending: boolean;
}

export function WriteReviewDialog({
  open,
  onOpenChange,
  booking,
  onSubmit,
  isPending,
}: WriteReviewDialogProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setRating(5);
      setComment("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit({ rating, comment });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("marketplace.client.writeReview")}</DialogTitle>
          <DialogDescription>
            {booking && getLocalizedText(booking.salon?.name as LocalizedText, currentLang)}
          </DialogDescription>
        </DialogHeader>
        {booking && (
          <div className="space-y-4">
            {/* Service & Master Info */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Scissors className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {getLocalizedText(booking.service?.name as LocalizedText, currentLang)}
                </span>
              </div>
              {booking.master && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{booking.master.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(booking.bookingDate).toLocaleDateString(
                    currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                  )}
                </span>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.yourRating")}</label>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    className="focus:outline-none transition-transform hover:scale-110"
                    data-testid={`new-star-rating-${i + 1}`}
                  >
                    <Star
                      className={`h-8 w-8 ${i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.yourComment")}</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("marketplace.client.commentPlaceholder")}
                className="mt-2"
                rows={4}
                data-testid="textarea-new-review-comment"
              />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("marketplace.client.close")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || rating === 0}
            data-testid="button-submit-new-review"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("marketplace.client.submitReview")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
