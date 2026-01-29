import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReviewFormProps {
  bookingId: string;
  salonId: string;
  masterId?: string;
  onSuccess?: () => void;
}

export function ReviewForm({ bookingId, salonId, masterId, onSuccess }: ReviewFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const createReviewMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      salonId: string;
      masterId?: string;
      rating: number;
      comment?: string;
    }) => {
      return apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      toast({
        title: t("reviews.reviewSuccess"),
        description: t("reviews.thankYou"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/salon", salonId] });
      if (masterId) {
        queryClient.invalidateQueries({ queryKey: ["/api/reviews/master", masterId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my-reviews"] });
      setRating(0);
      setComment("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("reviews.submitError"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: t("common.error"),
        description: t("reviews.ratingRequired"),
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      bookingId,
      salonId,
      masterId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <h3 className="text-lg font-semibold">{t("reviews.writeReview")}</h3>

      <div className="space-y-2">
        <Label>{t("reviews.yourRating")} *</Label>
        <StarRating rating={rating} onRatingChange={setRating} size="lg" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">{t("reviews.yourComment")}</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("reviews.commentPlaceholder")}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={createReviewMutation.isPending || rating === 0}>
        {createReviewMutation.isPending ? t("common.submitting") : t("reviews.submitReview")}
      </Button>
    </form>
  );
}
