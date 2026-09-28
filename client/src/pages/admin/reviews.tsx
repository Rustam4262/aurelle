import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, EyeOff, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface AdminReview {
  review: {
    id: string;
    salonId: string | null;
    masterId: string | null;
    rating: number;
    comment: string | null;
    ownerResponse: string | null;
    isHidden: boolean;
    hiddenReason: string | null;
    hiddenAt: string | null;
    createdAt: string;
  };
  clientName: string | null;
  salonName: string | null;
  masterName: string | null;
}

export default function AdminReviews() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [hideReason, setHideReason] = useState("");

  const queryParams: Record<string, string> = { limit: "100" };
  if (visibilityFilter === "visible") queryParams.hidden = "false";
  if (visibilityFilter === "hidden") queryParams.hidden = "true";

  const { data, isLoading } = useQuery<{ reviews: AdminReview[] }>({
    queryKey: ["/api/admin/reviews", queryParams],
  });

  const hideMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/reviews/${id}/hide`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: t("common.success"),
        description: t("admin.reviews.toasts.hiddenSuccess"),
      });
      setShowHideDialog(false);
      setSelectedReview(null);
      setHideReason("");
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("admin.reviews.toasts.hiddenFailed"),
        variant: "destructive",
      });
    },
  });

  const unhideMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/reviews/${id}/unhide`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: t("common.success"),
        description: t("admin.reviews.toasts.unhiddenSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("admin.reviews.toasts.unhiddenFailed"),
        variant: "destructive",
      });
    },
  });

  const handleHide = () => {
    if (!selectedReview || !hideReason.trim()) {
      toast({
        title: t("common.error"),
        description: t("admin.reviews.toasts.reasonRequired"),
        variant: "destructive",
      });
      return;
    }
    hideMutation.mutate({ id: selectedReview.review.id, reason: hideReason });
  };

  const openHideDialog = (review: AdminReview) => {
    setSelectedReview(review);
    setShowHideDialog(true);
    setHideReason("");
  };

  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">{t("admin.reviews.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("admin.reviews.subtitle")}</p>
      </div>

      <div className="flex gap-4">
        <div className="w-56">
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.reviews.filterByVisibility")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.reviews.allVisibility")}</SelectItem>
              <SelectItem value="visible">{t("admin.reviews.visibility.visible")}</SelectItem>
              <SelectItem value="hidden">{t("admin.reviews.visibility.hidden")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t("admin.reviews.allReviews")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">{t("admin.reviews.loading")}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("admin.reviews.noReviews")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.reviews.table.author")}</TableHead>
                  <TableHead>{t("admin.reviews.table.target")}</TableHead>
                  <TableHead>{t("admin.reviews.table.rating")}</TableHead>
                  <TableHead>{t("admin.reviews.table.comment")}</TableHead>
                  <TableHead>{t("admin.reviews.table.date")}</TableHead>
                  <TableHead>{t("admin.reviews.table.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.reviews.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((item) => (
                  <TableRow key={item.review.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{item.clientName || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.salonName || item.masterName || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{item.review.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2 max-w-md">{item.review.comment || "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.review.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {item.review.isHidden ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          {t("admin.reviews.statusBadge.hidden")}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          {t("admin.reviews.statusBadge.visible")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.review.isHidden ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unhideMutation.mutate(item.review.id)}
                            disabled={unhideMutation.isPending}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("admin.reviews.buttons.unhide")}
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => openHideDialog(item)}>
                            <EyeOff className="h-4 w-4 mr-1" />
                            {t("admin.reviews.buttons.hide")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.reviews.hideDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.reviews.hideDialog.description")}</DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{selectedReview.review.rating}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedReview.review.comment}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hide-reason">{t("admin.reviews.hideDialog.reasonLabel")}</Label>
                <Textarea
                  id="hide-reason"
                  placeholder={t("admin.reviews.hideDialog.reasonPlaceholder")}
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideDialog(false)}>
              {t("admin.reviews.buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleHide}
              disabled={hideMutation.isPending || !hideReason.trim()}
            >
              {hideMutation.isPending
                ? t("admin.reviews.buttons.hiding")
                : t("admin.reviews.buttons.hideButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
