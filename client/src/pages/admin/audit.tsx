import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { FileText, Search, Info } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface AuditLog {
  log: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorRole: string;
    createdAt: string;
    ip?: string;
    userAgent?: string;
    oldData?: any;
    newData?: any;
    meta?: any;
  };
  actorFirstName: string;
  actorLastName: string;
  actorEmail: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  block: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  unblock: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

function getActionColor(action: string): string {
  const actionType = action.split(".")[1] || action;
  return ACTION_COLORS[actionType] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
}

export default function AdminAudit() {
  const { t } = useTranslation();

  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Build query params
  const queryParams: Record<string, string> = { limit: "200" };
  if (actionFilter) queryParams.action = actionFilter;
  if (entityTypeFilter !== "all") queryParams.entityType = entityTypeFilter;

  const { data, isLoading } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ["/api/admin/audit", queryParams],
  });

  const openDetailsDialog = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">{t("admin.audit.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("admin.audit.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.audit.searchPlaceholder")}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-48">
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.audit.filterByEntity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.audit.allEntities")}</SelectItem>
              <SelectItem value="user">{t("admin.audit.entities.user")}</SelectItem>
              <SelectItem value="salon">{t("admin.audit.entities.salon")}</SelectItem>
              <SelectItem value="master">{t("admin.audit.entities.master")}</SelectItem>
              <SelectItem value="complaint">{t("admin.audit.entities.complaint")}</SelectItem>
              <SelectItem value="sanction">{t("admin.audit.entities.sanction")}</SelectItem>
              <SelectItem value="booking">{t("admin.audit.entities.booking")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("admin.audit.recentActions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">{t("admin.audit.loading")}</div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("admin.audit.noLogs")}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.audit.table.timestamp")}</TableHead>
                    <TableHead>{t("admin.audit.table.actor")}</TableHead>
                    <TableHead>{t("admin.audit.table.role")}</TableHead>
                    <TableHead>{t("admin.audit.table.action")}</TableHead>
                    <TableHead>{t("admin.audit.table.entity")}</TableHead>
                    <TableHead>{t("admin.audit.table.ipAddress")}</TableHead>
                    <TableHead className="text-right">{t("admin.audit.table.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map(({ log, actorFirstName, actorLastName, actorEmail }) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {actorFirstName && actorLastName
                              ? `${actorFirstName} ${actorLastName}`
                              : actorEmail || t("admin.audit.adminFallback")}
                          </p>
                          {actorEmail && (
                            <p className="text-xs text-muted-foreground">{actorEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.actorRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-xs ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium capitalize">{log.entityType}</p>
                          {log.entityId && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {log.entityId.slice(0, 12)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ip || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog({ log, actorFirstName, actorLastName, actorEmail })}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.audit.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.audit.dialog.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.action")}</Label>
                  <Badge variant="outline" className={`mt-1 ${getActionColor(selectedLog.log.action)}`}>
                    {selectedLog.log.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.timestamp")}</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedLog.log.createdAt), "PPpp")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.actor")}</Label>
                  <p className="text-sm mt-1">
                    {selectedLog.actorFirstName && selectedLog.actorLastName
                      ? `${selectedLog.actorFirstName} ${selectedLog.actorLastName}`
                      : selectedLog.actorEmail || t("admin.audit.adminFallback")}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedLog.actorEmail}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.role")}</Label>
                  <Badge variant="secondary" className="mt-1">
                    {selectedLog.log.actorRole}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.entityType")}</Label>
                  <p className="text-sm mt-1 capitalize">{selectedLog.log.entityType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.entityId")}</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.log.entityId || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.ipAddress")}</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.log.ip || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.userAgent")}</Label>
                  <p className="text-xs mt-1 text-muted-foreground truncate">
                    {selectedLog.log.userAgent || "—"}
                  </p>
                </div>
              </div>

              {/* Old Data */}
              {selectedLog.log.oldData && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.previousState")}</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.log.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Data */}
              {selectedLog.log.newData && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.newState")}</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.log.newData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Meta */}
              {selectedLog.log.meta && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.audit.dialog.labels.metadata")}</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.log.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t("admin.audit.dialog.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
