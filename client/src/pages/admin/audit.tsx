import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  log: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorRole: string;
    createdAt: string;
  };
  actorName: string;
  actorEmail: string;
}

export default function AdminAudit() {
  const { data, isLoading } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ["/api/admin/audit", { limit: 100 }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">Complete history of all admin actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No audit logs</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map(({ log, actorName }) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <p className="font-medium">{actorName || "Admin"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {log.entityType}
                        {log.entityId && `: ${log.entityId.slice(0, 8)}...`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.actorRole}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
