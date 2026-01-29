import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Mail,
  Phone,
  Calendar,
  Shield,
  MoreVertical,
  Eye,
  Ban,
  Unlock,
  Trash2,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  role: "client" | "owner" | "master" | "admin";
  status: "active" | "blocked";
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  blockedAt?: string | null;
  blockReason?: string | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ROLE_COLORS = {
  client: "bg-blue-100 text-blue-800",
  owner: "bg-purple-100 text-purple-800",
  master: "bg-green-100 text-green-800",
  admin: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

export default function AdminUsers() {
  const { toast } = useToast();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialogs
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [blockReason, setBlockReason] = useState("");

  // Fetch users
  const { data, isLoading, refetch } = useQuery<UsersResponse>({
    queryKey: [
      "/api/admin/users",
      {
        search,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      },
    ],
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/block`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockDialog({ open: false, user: null });
      setBlockReason("");
      toast({ title: "User blocked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to block user", variant: "destructive" });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/unblock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User unblocked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unblock user", variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteDialog({ open: false, user: null });
      toast({ title: "User deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const handleBlock = () => {
    if (!blockDialog.user || !blockReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    blockUserMutation.mutate({ userId: blockDialog.user.id, reason: blockReason });
  };

  const handleDelete = () => {
    if (!deleteDialog.user) return;
    deleteUserMutation.mutate(deleteDialog.user.id);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all platform users • {data?.total || 0} total users
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users...</div>
          ) : !data?.users || data.users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("fullName")}
                          className="font-semibold"
                        >
                          User
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("role")}
                          className="font-semibold"
                        >
                          Role
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("status")}
                          className="font-semibold"
                        >
                          Status
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("createdAt")}
                          className="font-semibold"
                        >
                          Joined
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.fullName || "No name"}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[user.role]}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[user.status]}>{user.status}</Badge>
                          {user.status === "blocked" && user.blockReason && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {user.blockReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.isEmailVerified ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 text-xs"
                              >
                                Email ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-xs">
                                Email ✗
                              </Badge>
                            )}
                            {user.phone &&
                              (user.isPhoneVerified ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 text-xs"
                                >
                                  Phone ✓
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-xs">
                                  Phone ✗
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/admin/users/${user.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {user.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => setBlockDialog({ open: true, user })}
                                  className="text-orange-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Block User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => unblockUserMutation.mutate(user.id)}
                                  className="text-green-600"
                                >
                                  <Unlock className="mr-2 h-4 w-4" />
                                  Unblock User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog({ open: true, user })}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)}{" "}
                    of {data.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-9"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {data.totalPages > 5 && <span className="px-2">...</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === data.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) => !open && setBlockDialog({ open: false, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Block {blockDialog.user?.fullName || blockDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="blockReason">Reason for blocking (required)</Label>
              <Textarea
                id="blockReason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Spam, abuse, violation of terms..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={!blockReason.trim() || blockUserMutation.isPending}
            >
              {blockUserMutation.isPending ? "Blocking..." : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              {deleteDialog.user?.fullName || deleteDialog.user?.email}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
