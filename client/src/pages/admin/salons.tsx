import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, MapPin } from "lucide-react";

interface Salon {
  id: string;
  name: any;
  address: any;
  isVerified: boolean;
  ownerId: string;
  createdAt: string;
}

export default function AdminSalons() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ salons: Salon[] }>({
    queryKey: ["/api/admin/salons", { limit: 50 }],
  });

  const verifyMutation = useMutation({
    mutationFn: (salonId: string) =>
      apiRequest("PATCH", `/api/admin/salons/${salonId}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/salons"] });
      toast({ title: "Salon verified successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to verify salon",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const unverifyMutation = useMutation({
    mutationFn: (salonId: string) =>
      apiRequest("PATCH", `/api/admin/salons/${salonId}/unverify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/salons"] });
      toast({ title: "Salon unverified" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to unverify salon",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const filtered = data?.salons.filter((salon) => {
    const name = typeof salon.name === "object" ? salon.name.en || salon.name.ru : salon.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Salon Management</h1>
        <p className="text-muted-foreground mt-2">Manage and verify salons</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search salons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No salons found</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salon</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((salon) => {
                    const name = typeof salon.name === "object" ? salon.name.en || salon.name.ru : salon.name;
                    const address = typeof salon.address === "object" ? salon.address.en || salon.address.ru : salon.address;

                    return (
                      <TableRow key={salon.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-muted-foreground">ID: {salon.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {salon.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Verified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {salon.isVerified ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unverifyMutation.mutate(salon.id)}
                              disabled={unverifyMutation.isPending}
                            >
                              Unverify
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => verifyMutation.mutate(salon.id)}
                              disabled={verifyMutation.isPending}
                            >
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
