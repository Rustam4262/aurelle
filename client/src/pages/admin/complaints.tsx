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

const CATEGORY_LABELS: Record<string, string> = {
  spam: "Spam",
  fraud: "Fraud",
  abuse: "Abuse",
  quality: "Quality",
  other: "Other",
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
      toast({ title: "Success", description: "Complaint assigned to you" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign complaint", variant: "destructive" });
    },
  });

  // Resolve complaint mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/complaints/${id}/resolve`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      toast({ title: "Success", description: "Complaint resolved" });
      setShowResolveDialog(false);
      setSelectedComplaint(null);
      setResolutionComment("");
      setDecision("no_action");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resolve complaint", variant: "destructive" });
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
      toast({ title: "Success", description: "Complaint rejected" });
      setSelectedComplaint(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject complaint", variant: "destructive" });
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
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
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
        <h1 className="text-3xl font-serif font-semibold">{t("marketplace.admin.complaints.title") || "Complaint Moderation"}</h1>
        <p className="text-muted-foreground mt-2">{t("marketplace.admin.complaints.subtitle") || "Review and resolve user complaints"}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="fraud">Fraud</SelectItem>
              <SelectItem value="abuse">Abuse</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t("marketplace.admin.complaints.allComplaints") || "All Complaints"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : !data?.complaints || data.complaints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No complaints</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complainant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.complaints.map(({ complaint, complainantFirstName, complainantLastName, complainantEmail }) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      <p className="font-medium">
                        {complainantFirstName && complainantLastName
                          ? `${complainantFirstName} ${complainantLastName}`
                          : complainantEmail || "Anonymous"}
                      </p>
                      {complainantEmail && (
                        <p className="text-xs text-muted-foreground">{complainantEmail}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{CATEGORY_LABELS[complaint.category] || complaint.category}</Badge>
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
                        {complaint.status.replace("_", " ")}
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
                            Assign
                          </Button>
                        )}
                        {complaint.status === "in_review" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openResolveDialog({ complaint, complainantFirstName, complainantLastName, complainantEmail })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRejectDialog({ complaint, complainantFirstName, complainantLastName, complainantEmail })}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
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

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
            <DialogDescription>
              {selectedComplaint && (
                <>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Description:</p>
                    <p className="text-sm mt-1">{selectedComplaint.complaint.description}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decision">Decision</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger id="decision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_action">No Action</SelectItem>
                  <SelectItem value="warning">Warning Issued</SelectItem>
                  <SelectItem value="sanction_applied">Sanction Applied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Resolution Comment</Label>
              <Textarea
                id="comment"
                placeholder="Explain the resolution decision..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Resolving..." : "Resolve Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!selectedComplaint && !showResolveDialog} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Complaint</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this complaint.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this complaint is being rejected..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !resolutionComment.trim()}>
              {rejectMutation.isPending ? "Rejecting..." : "Reject Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
