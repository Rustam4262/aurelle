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
import { Shield, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Sanction {
  id: string;
  targetType: string;
  targetId: string;
  sanctionType: string;
  reasonText: string;
  commentToUser?: string;
  internalNote?: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  revokedAt?: string;
  revokeReason?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  revoked: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const TYPE_LABELS: Record<string, string> = {
  temp_block: "Temporary Block",
  perm_block: "Permanent Block",
  feature_restrict: "Feature Restriction",
};

export default function AdminSanctions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  // Build query params
  const queryParams: Record<string, string> = { limit: "100" };
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (targetTypeFilter !== "all") queryParams.targetType = targetTypeFilter;

  const { data, isLoading } = useQuery<{ sanctions: Sanction[] }>({
    queryKey: ["/api/admin/sanctions", queryParams],
  });

  // Revoke sanction mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/sanctions/${id}/revoke`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sanctions"] });
      toast({ title: "Success", description: "Sanction revoked successfully" });
      setShowRevokeDialog(false);
      setSelectedSanction(null);
      setRevokeReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke sanction", variant: "destructive" });
    },
  });

  const handleRevoke = () => {
    if (!selectedSanction || !revokeReason.trim()) {
      toast({ title: "Error", description: "Please provide a revoke reason", variant: "destructive" });
      return;
    }
    revokeMutation.mutate({ id: selectedSanction.id, reason: revokeReason });
  };

  const openDetailsDialog = (sanction: Sanction) => {
    setSelectedSanction(sanction);
    setShowDetailsDialog(true);
  };

  const openRevokeDialog = (sanction: Sanction) => {
    setSelectedSanction(sanction);
    setShowRevokeDialog(true);
    setRevokeReason("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">{t("marketplace.admin.sanctions.title") || "Sanctions"}</h1>
        <p className="text-muted-foreground mt-2">{t("marketplace.admin.sanctions.subtitle") || "Manage user and salon sanctions"}</p>
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="salon">Salon</SelectItem>
              <SelectItem value="master">Master</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("marketplace.admin.sanctions.allSanctions") || "All Sanctions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : !data?.sanctions || data.sanctions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No sanctions</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ends At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sanctions.map((sanction) => (
                  <TableRow key={sanction.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium capitalize">{sanction.targetType}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {sanction.targetId.slice(0, 12)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPE_LABELS[sanction.sanctionType] || sanction.sanctionType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2 max-w-md">{sanction.reasonText}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[sanction.status]}>
                        {sanction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sanction.startsAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sanction.endsAt
                        ? format(new Date(sanction.endsAt), "MMM d, yyyy")
                        : "Permanent"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(sanction)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        {sanction.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRevokeDialog(sanction)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sanction Details</DialogTitle>
          </DialogHeader>

          {selectedSanction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target Type</Label>
                  <p className="text-sm mt-1 capitalize">{selectedSanction.targetType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target ID</Label>
                  <p className="text-sm mt-1 font-mono">{selectedSanction.targetId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sanction Type</Label>
                  <p className="text-sm mt-1">
                    {TYPE_LABELS[selectedSanction.sanctionType] || selectedSanction.sanctionType}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={`mt-1 ${STATUS_COLORS[selectedSanction.status]}`}>
                    {selectedSanction.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Started At</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedSanction.startsAt), "PPp")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ends At</Label>
                  <p className="text-sm mt-1">
                    {selectedSanction.endsAt
                      ? format(new Date(selectedSanction.endsAt), "PPp")
                      : "Permanent"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedSanction.reasonText}</p>
              </div>

              {selectedSanction.commentToUser && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Comment to User</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedSanction.commentToUser}</p>
                </div>
              )}

              {selectedSanction.internalNote && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Internal Note</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedSanction.internalNote}</p>
                </div>
              )}

              {selectedSanction.status === "revoked" && selectedSanction.revokeReason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Revoke Reason</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedSanction.revokeReason}</p>
                  {selectedSanction.revokedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Revoked on {format(new Date(selectedSanction.revokedAt), "PPp")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Sanction</DialogTitle>
            <DialogDescription>
              Provide a reason for revoking this sanction.
            </DialogDescription>
          </DialogHeader>

          {selectedSanction && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Target: {selectedSanction.targetType}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedSanction.reasonText}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revoke-reason">Revoke Reason *</Label>
                <Textarea
                  id="revoke-reason"
                  placeholder="Explain why this sanction is being revoked..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending || !revokeReason.trim()}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke Sanction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
