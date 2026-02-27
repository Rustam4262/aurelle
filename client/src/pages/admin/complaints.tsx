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
import { AlertCircle, UserCheck, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Complaint {
  complaint: {
    id: string;
    category: string;
    status: string;
    targetType: string;
    targetId: string;
    description: string;
    createdAt: string;
    assignedAdminId?: string;
    resolutionComment?: string;
    decision?: string;
  };
  complainantFirstName: string;
  complainantLastName: string;
  complainantEmail: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AdminComplaints() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionComment, setResolutionComment] = useState("");
  const [decision, setDecision] = useState<string>("no_action");

  // Build query params
  const queryParams: Record<string, string> = { limit: "100" };
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (categoryFilter !== "all") queryParams.category = categoryFilter;

  const { data, isLoading } = useQuery<{ complaints: Complaint[] }>({
    queryKey: ["/api/admin/complaints", queryParams],
  });

  // Assign complaint mutation
  const assignMutation = useMutation({
    mutationFn: async (complaintId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/complaints/${complaintId}/assign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      toast({ title: t("common.success"), description: t("admin.complaints.toasts.assigned") });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("admin.complaints.toasts.assignFailed"),
        variant: "destructive",
      });
    },
  });

  // Resolve complaint mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/admin/complaints/${id}/resolve`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      toast({ title: t("common.success"), description: t("admin.complaints.toasts.resolved") });
      setShowResolveDialog(false);
      setSelectedComplaint(null);
      setResolutionComment("");
      setDecision("no_action");
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("admin.complaints.toasts.resolveFailed"),
        variant: "destructive",
      });
    },
  });

  // Reject complaint mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/complaints/${id}/reject`, {
        resolutionComment: comment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      toast({ title: t("common.success"), description: t("admin.complaints.toasts.rejected") });
      setSelectedComplaint(null);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("admin.complaints.toasts.rejectFailed"),
        variant: "destructive",
      });
    },
  });

  const handleAssign = (complaintId: string) => {
    assignMutation.mutate(complaintId);
  };

  const handleResolve = () => {
    if (!selectedComplaint) return;
    resolveMutation.mutate({
      id: selectedComplaint.complaint.id,
      data: {
        decision,
        resolutionComment,
      },
    });
  };

  const handleReject = () => {
    if (!selectedComplaint || !resolutionComment.trim()) {
      toast({
        title: t("common.error"),
        description: t("admin.complaints.toasts.reasonRequired"),
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      id: selectedComplaint.complaint.id,
      comment: resolutionComment,
    });
  };

  const openResolveDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowResolveDialog(true);
    setResolutionComment("");
    setDecision("no_action");
  };

  const openRejectDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResolutionComment("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">{t("admin.complaints.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("admin.complaints.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.complaints.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.complaints.allStatus")}</SelectItem>
              <SelectItem value="open">{t("admin.complaints.status.open")}</SelectItem>
              <SelectItem value="in_review">{t("admin.complaints.status.in_review")}</SelectItem>
              <SelectItem value="resolved">{t("admin.complaints.status.resolved")}</SelectItem>
              <SelectItem value="rejected">{t("admin.complaints.status.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.complaints.filterByCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.complaints.allCategories")}</SelectItem>
              <SelectItem value="spam">{t("admin.complaints.categories.spam")}</SelectItem>
              <SelectItem value="fraud">{t("admin.complaints.categories.fraud")}</SelectItem>
              <SelectItem value="abuse">{t("admin.complaints.categories.abuse")}</SelectItem>
              <SelectItem value="quality">{t("admin.complaints.categories.quality")}</SelectItem>
              <SelectItem value="other">{t("admin.complaints.categories.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t("admin.complaints.allComplaints")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">{t("admin.complaints.loading")}</div>
          ) : !data?.complaints || data.complaints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("admin.complaints.noComplaints")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.complaints.table.complainant")}</TableHead>
                  <TableHead>{t("admin.complaints.table.category")}</TableHead>
                  <TableHead>{t("admin.complaints.table.target")}</TableHead>
                  <TableHead>{t("admin.complaints.table.status")}</TableHead>
                  <TableHead>{t("admin.complaints.table.date")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.complaints.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.complaints.map(
                  ({ complaint, complainantFirstName, complainantLastName, complainantEmail }) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <p className="font-medium">
                          {complainantFirstName && complainantLastName
                            ? `${complainantFirstName} ${complainantLastName}`
                            : complainantEmail || t("admin.complaints.anonymousFallback")}
                        </p>
                        {complainantEmail && (
                          <p className="text-xs text-muted-foreground">{complainantEmail}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(
                            `admin.complaints.categories.${complaint.category}`,
                            complaint.category,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {complaint.targetType}: {complaint.targetId.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {complaint.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[complaint.status]}>
                          {t(
                            `admin.complaints.status.${complaint.status}`,
                            complaint.status.replace("_", " "),
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(complaint.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {complaint.status === "open" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssign(complaint.id)}
                              disabled={assignMutation.isPending}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              {t("admin.complaints.buttons.assign")}
                            </Button>
                          )}
                          {complaint.status === "in_review" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  openResolveDialog({
                                    complaint,
                                    complainantFirstName,
                                    complainantLastName,
                                    complainantEmail,
                                  })
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t("admin.complaints.buttons.resolve")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openRejectDialog({
                                    complaint,
                                    complainantFirstName,
                                    complainantLastName,
                                    complainantEmail,
                                  })
                                }
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {t("admin.complaints.buttons.reject")}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.complaints.resolveDialog.title")}</DialogTitle>
            <DialogDescription>
              {selectedComplaint && (
                <>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      {t("admin.complaints.resolveDialog.description")}
                    </p>
                    <p className="text-sm mt-1">{selectedComplaint.complaint.description}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decision">{t("admin.complaints.resolveDialog.decisionLabel")}</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger id="decision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_action">
                    {t("admin.complaints.resolveDialog.decisions.none")}
                  </SelectItem>
                  <SelectItem value="warning">
                    {t("admin.complaints.resolveDialog.decisions.warning")}
                  </SelectItem>
                  <SelectItem value="sanction_applied">
                    {t("admin.complaints.resolveDialog.decisions.sanction")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">{t("admin.complaints.resolveDialog.commentLabel")}</Label>
              <Textarea
                id="comment"
                placeholder={t("admin.complaints.resolveDialog.commentPlaceholder")}
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              {t("admin.complaints.buttons.cancel")}
            </Button>
            <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending
                ? t("admin.complaints.buttons.resolving")
                : t("admin.complaints.resolveDialog.resolveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!selectedComplaint && !showResolveDialog}
        onOpenChange={() => setSelectedComplaint(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.complaints.rejectDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.complaints.rejectDialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                {t("admin.complaints.rejectDialog.reasonLabel")}
              </Label>
              <Textarea
                id="reject-reason"
                placeholder={t("admin.complaints.rejectDialog.reasonPlaceholder")}
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
              {t("admin.complaints.buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !resolutionComment.trim()}
            >
              {rejectMutation.isPending
                ? t("admin.complaints.buttons.rejecting")
                : t("admin.complaints.rejectDialog.rejectButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
