import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquare, Star, Edit, Trash2, Loader2, Clock, PenLine } from "lucide-react";
import { ClientReviewSkeleton } from "@/components/skeletons";
import type { EnrichedReview, EnrichedBooking } from "./types";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface ClientReviewsProps {
  reviews: EnrichedReview[] | undefined;
  isLoading: boolean;
  pendingReviewBookings?: EnrichedBooking[];
  onWriteReview?: (booking: EnrichedBooking) => void;
}

export function ClientReviews({ reviews, isLoading, pendingReviewBookings, onWriteReview }: ClientReviewsProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { toast } = useToast();

  const [editReviewDialogOpen, setEditReviewDialogOpen] = useState(false);
  const [deleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EnrichedReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  const editReviewMutation = useMutation({
    mutationFn: async ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment: string;
    }) => {
      return apiRequest("PUT", `/api/client/reviews/${id}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      setEditReviewDialogOpen(false);
      setSelectedReview(null);
      toast({ title: t("marketplace.client.reviewUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/client/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/reviews"] });
      setDeleteReviewDialogOpen(false);
      setSelectedReview(null);
      toast({ title: t("marketplace.client.reviewDeleted") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const canEditReview = (review: EnrichedReview) => {
    if (!review.createdAt) return false;
    const reviewDate = new Date(review.createdAt);
    const now = new Date();
    const minutesSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60);
    return minutesSinceReview <= 30;
  };

  const openEditReviewDialog = (review: EnrichedReview) => {
    setSelectedReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
    setEditReviewDialogOpen(true);
  };

  const openDeleteReviewDialog = (review: EnrichedReview) => {
    setSelectedReview(review);
    setDeleteReviewDialogOpen(true);
  };

  const handleEditReview = () => {
    if (selectedReview) {
      editReviewMutation.mutate({
        id: selectedReview.id,
        rating: editRating,
        comment: editComment,
      });
    }
  };

  const handleDeleteReview = () => {
    if (selectedReview) {
      deleteReviewMutation.mutate(selectedReview.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ClientReviewSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{t("marketplace.client.noReviews")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Reviews Section */}
      {pendingReviewBookings && pendingReviewBookings.length > 0 && (
        <Card className="p-4 border-dashed border-primary/50 bg-primary/5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-medium">{t("marketplace.client.pendingReviews")}</h3>
            <Badge variant="secondary" className="ml-auto">
              {pendingReviewBookings.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingReviewBookings.map((booking) => {
              const serviceName = getLocalizedText(booking.service?.name as any, currentLang);
              const salonName = getLocalizedText(booking.salon?.name as any, currentLang);
              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{serviceName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {salonName}
                      {booking.master && ` • ${booking.master.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.bookingDate).toLocaleDateString(
                        currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onWriteReview?.(booking)}
                    className="flex-shrink-0"
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    {t("marketplace.client.writeReview")}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Existing Reviews */}
      {reviews.map((review) => {
        const salonName = getLocalizedText(review.salon?.name as any, currentLang);
        const canEdit = canEditReview(review);

        return (
          <Card key={review.id} className="p-4" data-testid={`review-card-${review.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-medium text-foreground">{salonName}</h3>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.createdAt!).toLocaleDateString(
                    currentLang === "ru" ? "ru-RU" : currentLang === "uz" ? "uz-UZ" : "en-US",
                  )}
                  {canEdit && (
                    <span className="ml-2 text-primary">({t("marketplace.client.canEdit")})</span>
                  )}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditReviewDialog(review)}
                    data-testid={`button-edit-review-${review.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteReviewDialog(review)}
                    data-testid={`button-delete-review-${review.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <Dialog open={editReviewDialogOpen} onOpenChange={setEditReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.editReview")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.rating")}</label>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditRating(i + 1)}
                    className="focus:outline-none"
                    data-testid={`star-rating-${i + 1}`}
                  >
                    <Star
                      className={`h-6 w-6 ${i < editRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("marketplace.client.comment")}</label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder={t("marketplace.client.commentPlaceholder")}
                className="mt-2"
                data-testid="textarea-edit-comment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditReviewDialogOpen(false)}>
              {t("marketplace.client.close")}
            </Button>
            <Button
              onClick={handleEditReview}
              disabled={editReviewMutation.isPending}
              data-testid="button-save-review"
            >
              {editReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteReviewDialogOpen} onOpenChange={setDeleteReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.deleteReview")}</DialogTitle>
            <DialogDescription>{t("marketplace.client.deleteReviewConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteReviewDialogOpen(false)}>
              {t("marketplace.client.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReview}
              disabled={deleteReviewMutation.isPending}
              data-testid="button-confirm-delete-review"
            >
              {deleteReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("marketplace.client.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
