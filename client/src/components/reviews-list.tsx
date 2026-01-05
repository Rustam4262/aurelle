import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, User } from "lucide-react";

interface Review {
  id: string;
  clientId: string;
  salonId: string | null;
  masterId: string | null;
  bookingId: string | null;
  rating: number;
  comment: string | null;
  ownerResponse: string | null;
  createdAt: string;
  clientName?: string;
  masterName?: string;
}

interface ReviewsListProps {
  salonId?: string;
  masterId?: string;
  limit?: number;
}

export function ReviewsList({ salonId, masterId, limit = 20 }: ReviewsListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const endpoint = salonId
    ? `/api/reviews/salon/${salonId}`
    : masterId
    ? `/api/reviews/master/${masterId}`
    : null;

  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: [endpoint, { limit }],
    queryFn: async () => {
      if (!endpoint) return [];
      return apiRequest("GET", `${endpoint}?limit=${limit}`);
    },
    enabled: !!endpoint,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, ownerResponse }: { reviewId: string; ownerResponse: string }) => {
      return apiRequest("PATCH", `/api/reviews/${reviewId}/respond`, { ownerResponse });
    },
    onSuccess: () => {
      toast({
        title: t("reviews.responseSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setRespondingTo(null);
      setResponse("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("reviews.responseError"),
        variant: "destructive",
      });
    },
  });

  const handleRespond = (reviewId: string) => {
    if (!response.trim()) {
      toast({
        title: t("common.error"),
        description: t("reviews.responseRequired"),
        variant: "destructive",
      });
      return;
    }

    respondMutation.mutate({ reviewId, ownerResponse: response });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{t("reviews.noReviews")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("reviews.beFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{review.clientName || t("common.anonymous")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <StarRating rating={review.rating} readonly size="sm" />
            </div>

            {review.masterName && (
              <p className="text-sm text-muted-foreground mb-2">
                {t("reviews.masterLabel")}: {review.masterName}
              </p>
            )}

            {review.comment && (
              <p className="text-sm mt-2 leading-relaxed">{review.comment}</p>
            )}

            {review.ownerResponse && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">{t("reviews.ownerResponse")}</p>
                <p className="text-sm leading-relaxed">{review.ownerResponse}</p>
              </div>
            )}

            {!review.ownerResponse && salonId && user && (
              <div className="mt-4">
                {respondingTo === review.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder={t("reviews.yourResponse")}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(review.id)}
                        disabled={respondMutation.isPending}
                      >
                        {respondMutation.isPending ? t("common.submitting") : t("reviews.submitResponse")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRespondingTo(null);
                          setResponse("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRespondingTo(review.id)}
                  >
                    {t("reviews.respondToReview")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
