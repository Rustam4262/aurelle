import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";
import { format } from "date-fns";

interface Sanction {
  id: string;
  targetType: string;
  targetId: string;
  sanctionType: string;
  reasonText: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

export default function AdminSanctions() {
  const { data, isLoading } = useQuery<{ sanctions: Sanction[] }>({
    queryKey: ["/api/admin/sanctions", { limit: 50 }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Sanctions</h1>
        <p className="text-muted-foreground mt-2">Manage user and salon sanctions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Sanctions
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
                  <TableHead>Ends At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sanctions.map((sanction) => (
                  <TableRow key={sanction.id}>
                    <TableCell>
                      <p className="text-sm">
                        {sanction.targetType}: {sanction.targetId.slice(0, 8)}...
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sanction.sanctionType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-1">{sanction.reasonText}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          sanction.status === "active"
                            ? "bg-red-100 text-red-800"
                            : sanction.status === "expired"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {sanction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sanction.endsAt
                        ? format(new Date(sanction.endsAt), "MMM d, yyyy")
                        : "Permanent"}
                    </TableCell>
                    <TableCell className="text-right">
                      {sanction.status === "active" && (
                        <Button variant="ghost" size="sm">Revoke</Button>
                      )}
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
