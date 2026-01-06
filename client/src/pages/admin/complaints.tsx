import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Complaint {
  complaint: {
    id: string;
    category: string;
    status: string;
    targetType: string;
    targetId: string;
    description: string;
    createdAt: string;
  };
  complainantName: string;
  complainantEmail: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminComplaints() {
  const { data, isLoading } = useQuery<{ complaints: Complaint[] }>({
    queryKey: ["/api/admin/complaints", { limit: 50 }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Complaint Moderation</h1>
        <p className="text-muted-foreground mt-2">Review and resolve user complaints</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            All Complaints
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
                {data.complaints.map(({ complaint, complainantName }) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      <p className="font-medium">{complainantName || "Anonymous"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{complaint.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {complaint.targetType}: {complaint.targetId.slice(0, 8)}...
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[complaint.status]}>
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(complaint.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
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
