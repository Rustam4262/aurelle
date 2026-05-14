import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
// xlsx + jspdf are loaded on-demand when the user clicks Export РІР‚вЂќ not part of the initial chunk
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  role: "client" | "owner" | "salon_owner" | "master" | "admin";
  status: "active" | "blocked" | "deleted";
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  blockedAt?: string | null;
  blockReason?: string | null;
  deletedAt?: string | null;
  isDeleted?: boolean;
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
  salon_owner: "bg-purple-100 text-purple-800",
  master: "bg-green-100 text-green-800",
  admin: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
  deleted: "bg-slate-200 text-slate-800",
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Search & Filters РІР‚вЂќ initialized from URL query params
  const [search, setSearch] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("q") || "";
  });
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("role") || "all";
  });
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("status") || "all";
  });
  const [verificationFilter, setVerificationFilter] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("verification") || "all";
  });
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(() => {
    const p = new URLSearchParams(window.location.search);
    return Math.max(1, parseInt(p.get("page") || "1") || 1);
  });
  const pageSize = 20;
  const queryRoleFilter = roleFilter === "owner" ? "salon_owner" : roleFilter;

  // Sync active filters back to URL (uses debouncedSearch so URL only updates after typing stops)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (verificationFilter !== "all") params.set("verification", verificationFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [debouncedSearch, roleFilter, statusFilter, verificationFilter, page]);

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
  const [bulkBlockDialogOpen, setBulkBlockDialogOpen] = useState(false);

  // Fetch users
  const { data, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: [
      "/api/admin/users",
      {
        search: debouncedSearch,
        role: queryRoleFilter !== "all" ? queryRoleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      },
    ],
  });

  const { data: overviewStats } = useQuery<{
    total: number;
    active: number;
    blocked: number;
    deleted: number;
    emailVerified: number;
    phoneVerified: number;
    newToday: number;
    activeLastWeek: number;
    byRole?: {
      client: number;
      owner: number;
      master: number;
      admin: number;
    };
  }>({
    queryKey: ["/api/admin/users/stats/overview"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stats = overviewStats
    ? {
        total: overviewStats.total,
        active: overviewStats.active,
        blocked: overviewStats.blocked,
        deleted: overviewStats.deleted,
        emailVerified: overviewStats.emailVerified,
        phoneVerified: overviewStats.phoneVerified,
        newToday: overviewStats.newToday,
        activeLastWeek: overviewStats.activeLastWeek,
        byRole: overviewStats.byRole ?? {
          client: 0,
          owner: 0,
          master: 0,
          admin: 0,
        },
      }
    : data?.users
      ? {
          total: data.total,
          active: data.users.filter((u) => u.status === "active").length,
          blocked: data.users.filter((u) => u.status === "blocked").length,
          deleted: data.users.filter((u) => u.status === "deleted").length,
          emailVerified: data.users.filter((u) => u.isEmailVerified).length,
          phoneVerified: data.users.filter((u) => u.isPhoneVerified).length,
          newToday: data.users.filter((u) => {
            const createdAt = new Date(u.createdAt);
            const today = new Date();
            return createdAt.toDateString() === today.toDateString();
          }).length,
          byRole: {
            client: data.users.filter((u) => u.role === "client").length,
            owner: data.users.filter((u) => u.role === "owner" || u.role === "salon_owner").length,
            master: data.users.filter((u) => u.role === "master").length,
            admin: data.users.filter((u) => u.role === "admin").length,
          },
          activeLastWeek: data.users.filter((u) => {
            if (!u.lastLoginAt) return false;
            const lastLogin = new Date(u.lastLoginAt).getTime();
            return Date.now() - lastLogin <= 7 * 24 * 60 * 60 * 1000;
          }).length,

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

  const bulkBlockMutation = useMutation({
    mutationFn: async ({ userIds, reason }: { userIds: string[]; reason: string }) => {
      return apiRequest("POST", "/api/admin/users/bulk/block", { userIds, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats/overview"] });
      setBulkBlockDialogOpen(false);
      setBlockReason("");
      clearSelection();
      toast({ title: "Выбранные пользователи заблокированы" });
    },
    onError: () => {
      toast({ title: "Не удалось заблокировать выбранных пользователей", variant: "destructive" });
    },
  });

  const bulkUnblockMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return apiRequest("POST", "/api/admin/users/bulk/unblock", { userIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats/overview"] });
      clearSelection();
      toast({ title: "Выбранные пользователи разблокированы" });
    },
    onError: () => {
      toast({ title: "Не удалось разблокировать выбранных пользователей", variant: "destructive" });
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats/overview"] });
      toast({ title: "Пользователь восстановлен" });
    },
    onError: () => {
      toast({ title: "Не удалось восстановить пользователя", variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats/overview"] });
      setDeleteDialog({ open: false, user: null });
      toast({ title: "Пользователь удалён с платформы" });
    },
    onError: () => {
      toast({ title: "Не удалось удалить пользователя", variant: "destructive" });
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
    onError: (error: Error) => {
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

  const handleBulkBlock = () => {
    if (!blockReason.trim()) {
      toast({ title: "Укажите причину блокировки", variant: "destructive" });
      return;
    }
    bulkBlockMutation.mutate({ userIds: Array.from(selectedUsers), reason: blockReason.trim() });
  };

  const handleBulkUnblock = () => {
    const blockedIds = filteredUsers
      .filter((user) => selectedUsers.has(user.id) && user.status === "blocked")
      .map((user) => user.id);

    if (blockedIds.length === 0) {
      toast({ title: "Нет выбранных заблокированных пользователей", variant: "destructive" });
      return;
    }

    bulkUnblockMutation.mutate(blockedIds);
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

  // Export to Excel РІР‚вЂќ xlsx is loaded lazily on first click
  const exportToExcelFile = async () => {
    if (!data?.users || data.users.length === 0) {
      toast({ title: t("admin.users.toasts.noData"), variant: "destructive" });
      return;
    }

    const exportData = data.users.map((user) => ({
      ID: user.id,
      "Full Name": user.fullName,
      Email: user.email,
      Phone: user.phone || "",
      Role: user.role,
      Status: user.status,
      "Email Verified": user.isEmailVerified ? "Yes" : "No",
      "Phone Verified": user.isPhoneVerified ? "Yes" : "No",
      "Last Login": user.lastLoginAt
        ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm:ss")
        : "Never",
      "Login Count": user.loginCount || 0,
      "Created At": format(new Date(user.createdAt), "yyyy-MM-dd HH:mm:ss"),
      "Block Reason": user.blockReason || "",
    }));

    const filename = `users_export_${format(new Date(), "yyyy-MM-dd_HHmm")}`;
    const { exportToExcel } = await import("@/lib/export");
    exportToExcel(exportData, filename, "Users");

    toast({
      title: t("admin.users.toasts.exportSuccess"),
      description: `Exported ${data.users.length} users to Excel`,
    });
  };

  // Export to PDF РІР‚вЂќ jspdf is loaded lazily on first click
  const exportToPDFFile = async () => {
    if (!data?.users || data.users.length === 0) {
      toast({ title: t("admin.users.toasts.noData"), variant: "destructive" });
      return;
    }

    const exportData = data.users.map((user) => ({
      Name: user.fullName,
      Email: user.email,
      Phone: user.phone || "-",
      Role: user.role,
      Status: user.status,
      Verified: user.isEmailVerified && user.isPhoneVerified ? "Yes" : "No",
      Logins: user.loginCount || 0,
      Created: format(new Date(user.createdAt), "yyyy-MM-dd"),
    }));

    const filename = `users_report_${format(new Date(), "yyyy-MM-dd_HHmm")}`;
    const { exportToPDF } = await import("@/lib/export");
    exportToPDF(exportData, filename, "AURELLE Users Report", {
      orientation: "landscape",
    });

    toast({
      title: t("admin.users.toasts.exportSuccess"),
      description: `Exported ${data.users.length} users to PDF`,
    });
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

  const selectedUsersList = filteredUsers.filter((user) => selectedUsers.has(user.id));
  const selectedActiveCount = selectedUsersList.filter((user) => user.status === "active").length;
  const selectedBlockedCount = selectedUsersList.filter((user) => user.status === "blocked").length;
  const selectedDeletedCount = selectedUsersList.filter((user) => user.status === "deleted").length;
  const selectedVerifiedCount = selectedUsersList.filter(
    (user) => user.isEmailVerified && user.isPhoneVerified,
  ).length;

  const quickSegments = [
    {
      id: "all",
      label: "Все пользователи",
      active: roleFilter === "all" && statusFilter === "all" && verificationFilter === "all",
      onClick: () => {
        setRoleFilter("all");
        setStatusFilter("all");
        setVerificationFilter("all");
        setPage(1);
      },
    },
    {
      id: "active",
      label: "Активные",
      active: statusFilter === "active" && roleFilter === "all",
      onClick: () => {
        setRoleFilter("all");
        setStatusFilter("active");
        setVerificationFilter("all");
        setPage(1);
      },
    },
    {
      id: "blocked",
      label: "Заблокированные",
      active: statusFilter === "blocked" && roleFilter === "all",
      onClick: () => {
        setRoleFilter("all");
        setStatusFilter("blocked");
        setVerificationFilter("all");
        setPage(1);
      },
    },
    {
      id: "deleted",
      label: "Удалённые",
      active: statusFilter === "deleted" && roleFilter === "all",
      onClick: () => {
        setRoleFilter("all");
        setStatusFilter("deleted");
        setVerificationFilter("all");
        setPage(1);
      },
    },
    {
      id: "verified",
      label: "Полностью верифицированные",
      active: verificationFilter === "verified",
      onClick: () => {
        setRoleFilter("all");
        setStatusFilter("all");
        setVerificationFilter("verified");
        setPage(1);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full px-3 py-1">Users desk</Badge>
              {selectedUsers.size > 0 && (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {selectedUsers.size} {t("admin.users.selectedCount")}
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                {t("admin.users.title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data?.total != null
                  ? `${data.total} ${t("admin.users.totalCount")}`
                  : t("admin.users.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button variant="outline" size="sm" onClick={exportToExcelFile} disabled={!data?.users || data.users.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {t("admin.users.exportExcel")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDFFile} disabled={!data?.users || data.users.length === 0}>
              <FileText className="mr-2 h-4 w-4" />
              {t("admin.users.exportPdf")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {t("admin.users.refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedUsers.size} {t("admin.users.selectedCount")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Active: {selectedActiveCount}</Badge>
                  <Badge variant="outline">Blocked: {selectedBlockedCount}</Badge>
                  <Badge variant="outline">Deleted: {selectedDeletedCount}</Badge>
                  <Badge variant="outline">Verified: {selectedVerifiedCount}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t("admin.users.clearSelection")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUnblock}
                  disabled={selectedBlockedCount === 0 || bulkUnblockMutation.isPending}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Unblock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const deletedIds = filteredUsers
                      .filter((user) => selectedUsers.has(user.id) && user.status === "deleted")
                      .map((user) => user.id);
                    deletedIds.forEach((id) => restoreUserMutation.mutate(id));
                  }}
                  disabled={selectedDeletedCount === 0 || restoreUserMutation.isPending}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkBlockDialogOpen(true)}
                  disabled={selectedActiveCount === 0}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Block
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
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.stats.totalUsers")}
                  </p>
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
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.stats.active")}
                  </p>
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
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.stats.blocked")}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.users.stats.byRole")}
                </p>
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

      <div className="flex flex-wrap gap-2">
        {quickSegments.map((segment) => (
          <Button
            key={segment.id}
            type="button"
            variant={segment.active ? "default" : "outline"}
            size="sm"
            onClick={segment.onClick}
            className="rounded-full"
          >
            {segment.label}
          </Button>
        ))}
      </div>

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
                <SelectItem value="deleted">Удалённые</SelectItem>
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
                <SelectItem value="email-verified">
                  {t("admin.users.verification.emailVerified")}
                </SelectItem>
                <SelectItem value="phone-verified">
                  {t("admin.users.verification.phoneVerified")}
                </SelectItem>
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
              <p className="text-sm text-muted-foreground mb-4">{t("admin.users.loadErrorDesc")}</p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("admin.users.tryAgain")}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>{t("admin.users.table.user")}</TableHead>
                    <TableHead>{t("admin.users.table.contact")}</TableHead>
                    <TableHead>{t("admin.users.table.role")}</TableHead>
                    <TableHead>{t("admin.users.table.status")}</TableHead>
                    <TableHead>{t("admin.users.table.verification")}</TableHead>
                    <TableHead>{t("admin.users.table.joined")}</TableHead>
                    <TableHead className="text-right">{t("admin.users.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-36" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{t("admin.users.noUsersFound")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || roleFilter !== "all" || statusFilter !== "all" || verificationFilter !== "all"
                  ? t("admin.users.noUsersFiltered")
                  : t("admin.users.noUsersEmpty")}
              </p>
              <div className="flex items-center gap-3 justify-center">
                {(search || roleFilter !== "all" || statusFilter !== "all" || verificationFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                      setVerificationFilter("all");
                      setPage(1);
                    }}
                  >
                    {t("admin.users.clearFilters")}
                  </Button>
                )}
                {!search && roleFilter === "all" && statusFilter === "all" && verificationFilter === "all" && (
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
                      <TableRow
                        key={user.id}
                        className={selectedUsers.has(user.id) ? "bg-muted/50" : ""}
                      >
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
                            <p className="font-medium">
                              {user.fullName || t("admin.users.table.noName")}
                            </p>
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
                          <Badge className={ROLE_COLORS[user.role]}>{user.role === "salon_owner" ? t("admin.users.roles.owner") : user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[user.status]}>{user.status}</Badge>
                          {(user.status === "blocked" || user.status === "deleted") && user.blockReason && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {user.blockReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full border ${
                                      user.isEmailVerified
                                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
                                        : "bg-muted border-muted-foreground/20 text-muted-foreground"
                                    }`}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {t(
                                    user.isEmailVerified
                                      ? "admin.users.table.emailVerified"
                                      : "admin.users.table.emailUnverified",
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full border ${
                                      !user.phone
                                        ? "opacity-25 bg-muted border-muted-foreground/20 text-muted-foreground"
                                        : user.isPhoneVerified
                                          ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
                                          : "bg-muted border-muted-foreground/20 text-muted-foreground"
                                    }`}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {!user.phone
                                    ? "—"
                                    : t(
                                        user.isPhoneVerified
                                          ? "admin.users.table.phoneVerified"
                                          : "admin.users.table.phoneUnverified",
                                      )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                              <DropdownMenuItem
                                onClick={() => setQuickViewDialog({ open: true, user })}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t("admin.users.actions.quickView")}
                              </DropdownMenuItem>
                              <Link href={`/admin/users/${encodeURIComponent(user.id)}`}>
                                <DropdownMenuItem>
                                  <Shield className="mr-2 h-4 w-4" />
                                  {t("admin.users.actions.fullDetails")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {user.status === "deleted" ? (
                                <DropdownMenuItem
                                  onClick={() => restoreUserMutation.mutate(user.id)}
                                  className="text-green-600"
                                >
                                  <Unlock className="mr-2 h-4 w-4" />
                                  Восстановить
                                </DropdownMenuItem>
                              ) : user.status === "active" ? (
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
                              {user.status !== "deleted" && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteDialog({ open: true, user })}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить с платформы
                                </DropdownMenuItem>
                              )}
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
                    {t("admin.users.pagination.showing")} {(page - 1) * pageSize + 1}{" "}
                    {t("admin.users.pagination.to")} {Math.min(page * pageSize, data.total)}{" "}
                    {t("admin.users.pagination.of")} {data.total}{" "}
                    {t("admin.users.pagination.users")}
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
              {t("admin.users.blockDialog.descPrefix")}
              {blockDialog.user?.fullName || blockDialog.user?.email}
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
              {blockUserMutation.isPending
                ? t("admin.users.blockDialog.blocking")
                : t("admin.users.blockDialog.blockButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkBlockDialogOpen} onOpenChange={setBulkBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать выбранных пользователей</DialogTitle>
            <DialogDescription>
              Выберите причину блокировки. Это действие применится к выбранным пользователям и попадёт в аудит.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulkBlockReason">Причина блокировки</Label>
              <Textarea
                id="bulkBlockReason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Например: подозрительная активность, нарушение правил, подтверждённая жалоба"
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkBlockDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkBlock}
              disabled={!blockReason.trim() || bulkBlockMutation.isPending}
            >
              {bulkBlockMutation.isPending ? "Блокирую..." : "Подтвердить блокировку"}
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
            <DialogTitle>Удалить пользователя с платформы</DialogTitle>
            <DialogDescription>
              Пользователь {deleteDialog.user?.fullName || deleteDialog.user?.email} исчезнет из платформы,
              не сможет войти и не будет показываться в списках клиентов, мастеров и салонов.
              Администратор сможет восстановить его позже.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Удаляем..." : "Удалить с платформы"}
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
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.viewDialog.labels.fullName")}
                  </Label>
                  <p className="mt-1 text-sm">{quickViewDialog.user.fullName || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.viewDialog.labels.role")}
                  </Label>
                  <Badge className={ROLE_COLORS[quickViewDialog.user.role]} variant="outline">
                    {quickViewDialog.user.role === "salon_owner" ? t("admin.users.roles.owner") : quickViewDialog.user.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.viewDialog.labels.email")}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{quickViewDialog.user.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.users.viewDialog.labels.phone")}
                  </Label>
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
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("admin.users.viewDialog.labels.accountStatus")}
                    </Label>
                    <Badge className={STATUS_COLORS[quickViewDialog.user.status]} variant="outline">
                      {quickViewDialog.user.status}
                    </Badge>
                    {quickViewDialog.user.status === "blocked" &&
                      quickViewDialog.user.blockReason && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {quickViewDialog.user.blockReason}
                        </p>
                      )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("admin.users.viewDialog.labels.verification")}
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {quickViewDialog.user.isEmailVerified ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {t("admin.users.table.emailVerified")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          {t("admin.users.table.emailUnverified")}
                        </Badge>
                      )}
                      {quickViewDialog.user.phone &&
                        (quickViewDialog.user.isPhoneVerified ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {t("admin.users.table.phoneVerified")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            {t("admin.users.table.phoneUnverified")}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("admin.users.viewDialog.labels.memberSince")}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(quickViewDialog.user.createdAt), "PPP")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("admin.users.viewDialog.labels.userId")}
                    </Label>
                    <p className="text-xs font-mono mt-1 text-muted-foreground">
                      {quickViewDialog.user.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickViewDialog({ open: false, user: null })}
            >
              {t("admin.users.viewDialog.close")}
            </Button>
            {quickViewDialog.user && (
              <Link href={`/admin/users/${encodeURIComponent(quickViewDialog.user.id)}`}>
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
            <DialogDescription>{t("admin.users.testUsersDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 text-sm">
              <p className="font-medium">{t("admin.users.testUsersDialog.toBeCreated")}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>2 Clients (Инна Иванова, Дмитрий Петров)</li>
                <li>2 Salon Owners (Ольга Смирнова, Сергей Козлов)</li>
                <li>2 Masters (Елена Волкова, Алексей Морозов)</li>
                <li>1 Blocked User (для тестирования блокировки)</li>
              </ul>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">{t("admin.users.testUsersDialog.credentials")}</p>
                <p className="text-muted-foreground">
                  {t("admin.users.testUsersDialog.email")}{" "}
                  <code className="text-xs">client1@test.com</code> (или любой другой)
                </p>
                <p className="text-muted-foreground">
                  {t("admin.users.testUsersDialog.password")}{" "}
                  <code className="text-xs">TestPass123!</code>
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
              {seedTestUsersMutation.isPending
                ? t("admin.users.testUsersDialog.creating")
                : t("admin.users.testUsersDialog.createButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
















