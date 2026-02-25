import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportToExcel, exportToPDF, formatDataForExcel } from "@/lib/export";
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
  RefreshCw,
  Users as UsersIcon,
  UserCheck,
  UserX,
  AlertCircle,
  Download,
  CheckSquare,
  Square,
  Clock,
  ShieldCheck,
  ShieldX,
  FileText,
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
  lastLoginAt?: string | null;
  loginCount?: number;
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
  const { t } = useTranslation();
  const { toast } = useToast();

  // Search & Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Dialogs
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [quickViewDialog, setQuickViewDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [blockReason, setBlockReason] = useState("");
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  // Fetch users
  const { data, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: [
      "/api/admin/users",
      {
        search: debouncedSearch,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      },
    ],
  });

  // Calculate stats from current data
  const stats = data?.users
    ? {
        total: data.total,
        active: data.users.filter((u) => u.status === "active").length,
        blocked: data.users.filter((u) => u.status === "blocked").length,
        byRole: {
          client: data.users.filter((u) => u.role === "client").length,
          owner: data.users.filter((u) => u.role === "owner").length,
          master: data.users.filter((u) => u.role === "master").length,
          admin: data.users.filter((u) => u.role === "admin").length,
        },
      }
    : null;

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/block`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockDialog({ open: false, user: null });
      setBlockReason("");
      toast({ title: t("admin.users.toasts.blockedSuccess") });
    },
    onError: () => {
      toast({ title: t("admin.users.toasts.blockFailed"), variant: "destructive" });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/unblock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t("admin.users.toasts.unblockedSuccess") });
    },
    onError: () => {
      toast({ title: t("admin.users.toasts.unblockFailed"), variant: "destructive" });
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
      toast({ title: t("admin.users.toasts.deletedSuccess") });
    },
    onError: () => {
      toast({ title: t("admin.users.toasts.deleteFailed"), variant: "destructive" });
    },
  });

  // Seed test users mutation
  const seedTestUsersMutation = useMutation({
    mutationFn: async (confirmProduction: boolean = false) => {
      const res = await apiRequest("POST", "/api/admin/seed/test-users", {
        confirmProduction,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowSeedDialog(false);
      toast({
        title: t("admin.users.toasts.testCreated"),
        description: `Created ${data.created} users, skipped ${data.skipped} existing`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.toasts.testFailed"),
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleBlock = () => {
    if (!blockDialog.user || !blockReason.trim()) {
      toast({ title: t("admin.users.toasts.pleaseProvideReason"), variant: "destructive" });
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

  // Bulk selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll || selectedUsers.size === data?.users.length) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(data?.users.map((u) => u.id) || []);
      setSelectedUsers(allIds);
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
    setSelectAll(false);
  };

  // Export to CSV
  const exportToExcelFile = () => {
    if (!data?.users || data.users.length === 0) {
      toast({ title: t("admin.users.toasts.noData"), variant: "destructive" });
      return;
    }

    // Prepare data for Excel export
    const exportData = data.users.map((user) => ({
      "ID": user.id,
      "Full Name": user.fullName,
      "Email": user.email,
      "Phone": user.phone || "",
      "Role": user.role,
      "Status": user.status,
      "Email Verified": user.isEmailVerified ? "Yes" : "No",
      "Phone Verified": user.isPhoneVerified ? "Yes" : "No",
      "Last Login": user.lastLoginAt ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm:ss") : "Never",
      "Login Count": user.loginCount || 0,
      "Created At": format(new Date(user.createdAt), "yyyy-MM-dd HH:mm:ss"),
      "Block Reason": user.blockReason || "",
    }));

    // Export to Excel
    const filename = `users_export_${format(new Date(), "yyyy-MM-dd_HHmm")}`;
    exportToExcel(exportData, filename, "Users");

    toast({ title: t("admin.users.toasts.exportSuccess"), description: `Exported ${data.users.length} users to Excel` });
  };

  // Export to PDF
  const exportToPDFFile = () => {
    if (!data?.users || data.users.length === 0) {
      toast({ title: t("admin.users.toasts.noData"), variant: "destructive" });
      return;
    }

    // Prepare data for PDF export
    const exportData = data.users.map((user) => ({
      "Name": user.fullName,
      "Email": user.email,
      "Phone": user.phone || "-",
      "Role": user.role,
      "Status": user.status,
      "Verified": user.isEmailVerified && user.isPhoneVerified ? "Yes" : "No",
      "Logins": user.loginCount || 0,
      "Created": format(new Date(user.createdAt), "yyyy-MM-dd"),
    }));

    const filename = `users_report_${format(new Date(), "yyyy-MM-dd_HHmm")}`;
    exportToPDF(exportData, filename, "AURELLE Users Report", {
      orientation: "landscape",
    });

    toast({ title: t("admin.users.toasts.exportSuccess"), description: `Exported ${data.users.length} users to PDF` });
  };

  // Filter users by verification status
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (verificationFilter === "all") return data.users;

    return data.users.filter((user) => {
      if (verificationFilter === "verified") {
        return user.isEmailVerified && user.isPhoneVerified;
      } else if (verificationFilter === "email-verified") {
        return user.isEmailVerified;
      } else if (verificationFilter === "phone-verified") {
        return user.isPhoneVerified;
      } else if (verificationFilter === "unverified") {
        return !user.isEmailVerified && !user.isPhoneVerified;
      }
      return true;
    });
  }, [data?.users, verificationFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("admin.users.subtitle")} {data?.total || 0} {t("admin.users.totalCount")}
            {selectedUsers.size > 0 && ` • ${selectedUsers.size} ${t("admin.users.selectedCount")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcelFile} disabled={!data?.users || data.users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("admin.users.exportExcel")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDFFile} disabled={!data?.users || data.users.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            {t("admin.users.exportPdf")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {t("admin.users.refresh")}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedUsers.size} {t("admin.users.selectedCount")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t("admin.users.clearSelection")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Bulk actions",
                      description: "Bulk block/delete coming soon!",
                    });
                  }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t("admin.users.bulkActions")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("admin.users.stats.totalUsers")}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("admin.users.stats.active")}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("admin.users.stats.blocked")}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("admin.users.stats.byRole")}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>{t("admin.users.stats.clients")}</span>
                    <span className="font-bold">{stats.byRole.client}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("admin.users.stats.owners")}</span>
                    <span className="font-bold">{stats.byRole.owner}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("admin.users.stats.masters")}</span>
                    <span className="font-bold">{stats.byRole.master}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("admin.users.stats.admins")}</span>
                    <span className="font-bold">{stats.byRole.admin}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("admin.users.searchFilters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.users.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && debouncedSearch !== search && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.roles.allRoles")}</SelectItem>
                <SelectItem value="client">{t("admin.users.roles.client")}</SelectItem>
                <SelectItem value="owner">{t("admin.users.roles.owner")}</SelectItem>
                <SelectItem value="master">{t("admin.users.roles.master")}</SelectItem>
                <SelectItem value="admin">{t("admin.users.roles.admin")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.statuses.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("admin.users.statuses.active")}</SelectItem>
                <SelectItem value="blocked">{t("admin.users.statuses.blocked")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Verification Filter */}
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.verification.all")}</SelectItem>
                <SelectItem value="verified">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    {t("admin.users.verification.fullyVerified")}
                  </div>
                </SelectItem>
                <SelectItem value="email-verified">{t("admin.users.verification.emailVerified")}</SelectItem>
                <SelectItem value="phone-verified">{t("admin.users.verification.phoneVerified")}</SelectItem>
                <SelectItem value="unverified">
                  <div className="flex items-center gap-2">
                    <ShieldX className="h-4 w-4 text-red-600" />
                    {t("admin.users.verification.unverified")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("admin.users.loadError")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("admin.users.loadErrorDesc")}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("admin.users.tryAgain")}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("admin.users.loadingUsers")}</p>
            </div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{t("admin.users.noUsersFound")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || roleFilter !== "all" || statusFilter !== "all"
                  ? t("admin.users.noUsersFiltered")
                  : t("admin.users.noUsersEmpty")}
              </p>
              <div className="flex items-center gap-3 justify-center">
                {(search || roleFilter !== "all" || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                  >
                    {t("admin.users.clearFilters")}
                  </Button>
                )}
                {!search && roleFilter === "all" && statusFilter === "all" && (
                  <Button variant="default" onClick={() => setShowSeedDialog(true)}>
                    <UsersIcon className="h-4 w-4 mr-2" />
                    {t("admin.users.createTestUsers")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={toggleSelectAll}
                        >
                          {selectAll || selectedUsers.size === filteredUsers.length ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("fullName")}
                          className="font-semibold"
                        >
                          {t("admin.users.table.user")}
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>{t("admin.users.table.contact")}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("role")}
                          className="font-semibold"
                        >
                          {t("admin.users.table.role")}
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
                          {t("admin.users.table.status")}
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>{t("admin.users.table.verification")}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("createdAt")}
                          className="font-semibold"
                        >
                          {t("admin.users.table.joined")}
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">{t("admin.users.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className={selectedUsers.has(user.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleUserSelection(user.id)}
                          >
                            {selectedUsers.has(user.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.fullName || t("admin.users.table.noName")}</p>
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
                                {t("admin.users.table.emailVerified")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-xs">
                                {t("admin.users.table.emailUnverified")}
                              </Badge>
                            )}
                            {user.phone &&
                              (user.isPhoneVerified ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 text-xs"
                                >
                                  {t("admin.users.table.phoneVerified")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-xs">
                                  {t("admin.users.table.phoneUnverified")}
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
                              <DropdownMenuItem onClick={() => setQuickViewDialog({ open: true, user })}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t("admin.users.actions.quickView")}
                              </DropdownMenuItem>
                              <Link href={`/admin/users/${user.id}`}>
                                <DropdownMenuItem>
                                  <Shield className="mr-2 h-4 w-4" />
                                  {t("admin.users.actions.fullDetails")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {user.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => setBlockDialog({ open: true, user })}
                                  className="text-orange-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  {t("admin.users.actions.blockUser")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => unblockUserMutation.mutate(user.id)}
                                  className="text-green-600"
                                >
                                  <Unlock className="mr-2 h-4 w-4" />
                                  {t("admin.users.actions.unblockUser")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog({ open: true, user })}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("admin.users.actions.deleteUser")}
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
                    {t("admin.users.pagination.showing")} {(page - 1) * pageSize + 1} {t("admin.users.pagination.to")} {Math.min(page * pageSize, data.total)}{" "}
                    {t("admin.users.pagination.of")} {data.total} {t("admin.users.pagination.users")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t("admin.users.pagination.previous")}
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
                      {t("admin.users.pagination.next")}
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
            <DialogTitle>{t("admin.users.blockDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.blockDialog.descPrefix")}{blockDialog.user?.fullName || blockDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="blockReason">{t("admin.users.blockDialog.reasonLabel")}</Label>
              <Textarea
                id="blockReason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder={t("admin.users.blockDialog.reasonPlaceholder")}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, user: null })}>
              {t("admin.users.blockDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={!blockReason.trim() || blockUserMutation.isPending}
            >
              {blockUserMutation.isPending ? t("admin.users.blockDialog.blocking") : t("admin.users.blockDialog.blockButton")}
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
            <DialogTitle>{t("admin.users.deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.deleteDialog.descPrefix")}
              {deleteDialog.user?.fullName || deleteDialog.user?.email}{t("admin.users.deleteDialog.descSuffix")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              {t("admin.users.deleteDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? t("admin.users.deleteDialog.deleting") : t("admin.users.deleteDialog.deleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick View Dialog */}
      <Dialog
        open={quickViewDialog.open}
        onOpenChange={(open) => !open && setQuickViewDialog({ open: false, user: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.users.viewDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.users.viewDialog.description")}</DialogDescription>
          </DialogHeader>
          {quickViewDialog.user && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.fullName")}</Label>
                  <p className="mt-1 text-sm">{quickViewDialog.user.fullName || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.role")}</Label>
                  <Badge className={ROLE_COLORS[quickViewDialog.user.role]} variant="outline">
                    {quickViewDialog.user.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.email")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{quickViewDialog.user.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.phone")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{quickViewDialog.user.phone || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.accountStatus")}</Label>
                    <Badge className={STATUS_COLORS[quickViewDialog.user.status]} variant="outline">
                      {quickViewDialog.user.status}
                    </Badge>
                    {quickViewDialog.user.status === "blocked" && quickViewDialog.user.blockReason && (
                      <p className="text-xs text-muted-foreground mt-2">{quickViewDialog.user.blockReason}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.verification")}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {quickViewDialog.user.isEmailVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {t("admin.users.table.emailVerified")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          {t("admin.users.table.emailUnverified")}
                        </Badge>
                      )}
                      {quickViewDialog.user.phone && (
                        quickViewDialog.user.isPhoneVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {t("admin.users.table.phoneVerified")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            {t("admin.users.table.phoneUnverified")}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.memberSince")}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">{format(new Date(quickViewDialog.user.createdAt), "PPP")}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">{t("admin.users.viewDialog.labels.userId")}</Label>
                    <p className="text-xs font-mono mt-1 text-muted-foreground">{quickViewDialog.user.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickViewDialog({ open: false, user: null })}>
              {t("admin.users.viewDialog.close")}
            </Button>
            {quickViewDialog.user && (
              <Link href={`/admin/users/${quickViewDialog.user.id}`}>
                <Button>
                  <Shield className="h-4 w-4 mr-2" />
                  {t("admin.users.viewDialog.viewFull")}
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed Test Users Dialog */}
      <Dialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.testUsersDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.testUsersDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 text-sm">
              <p className="font-medium">{t("admin.users.testUsersDialog.toBeCreated")}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>2 Clients (Анна Иванова, Дмитрий Петров)</li>
                <li>2 Salon Owners (Ольга Смирнова, Сергей Козлов)</li>
                <li>2 Masters (Елена Волкова, Алексей Морозов)</li>
                <li>1 Blocked User (для тестирования блокировки)</li>
              </ul>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">{t("admin.users.testUsersDialog.credentials")}</p>
                <p className="text-muted-foreground">
                  {t("admin.users.testUsersDialog.email")} <code className="text-xs">client1@test.com</code> (или любой другой)
                </p>
                <p className="text-muted-foreground">
                  {t("admin.users.testUsersDialog.password")} <code className="text-xs">TestPass123!</code>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeedDialog(false)}>
              {t("admin.users.testUsersDialog.cancel")}
            </Button>
            <Button
              onClick={() => seedTestUsersMutation.mutate(false)}
              disabled={seedTestUsersMutation.isPending}
            >
              {seedTestUsersMutation.isPending ? t("admin.users.testUsersDialog.creating") : t("admin.users.testUsersDialog.createButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
