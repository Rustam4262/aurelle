import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Search,
} from "lucide-react";

interface SalonManager {
  id: string;
  salonId: string;
  userId: string;
  permissions: string[];
  status: "pending" | "active" | "revoked";
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  fullName?: string;
  email: string;
}

interface SalonTeamManagementProps {
  salonId: string;
}

// Permission definitions matching backend
const MANAGER_PERMISSIONS = {
  READ_SALON_INFO: "manager.read_salon",
  READ_DASHBOARD: "manager.read_dashboard",
  READ_BOOKINGS: "manager.read_bookings",
  MANAGE_BOOKINGS: "manager.manage_bookings",
  READ_SERVICES: "manager.read_services",
  MANAGE_SERVICES: "manager.manage_services",
  READ_MASTERS: "manager.read_masters",
  MANAGE_MASTERS: "manager.manage_masters",
  READ_CALENDAR: "manager.read_calendar",
  MANAGE_CALENDAR: "manager.manage_calendar",
  VIEW_ANALYTICS: "manager.view_analytics",
} as const;

const DEFAULT_PERMISSIONS = [
  MANAGER_PERMISSIONS.READ_SALON_INFO,
  MANAGER_PERMISSIONS.READ_DASHBOARD,
  MANAGER_PERMISSIONS.READ_BOOKINGS,
  MANAGER_PERMISSIONS.MANAGE_BOOKINGS,
  MANAGER_PERMISSIONS.READ_SERVICES,
  MANAGER_PERMISSIONS.READ_MASTERS,
  MANAGER_PERMISSIONS.READ_CALENDAR,
  MANAGER_PERMISSIONS.VIEW_ANALYTICS,
];

const PERMISSION_PRESETS = {
  operations: [
    MANAGER_PERMISSIONS.READ_SALON_INFO,
    MANAGER_PERMISSIONS.READ_DASHBOARD,
    MANAGER_PERMISSIONS.READ_BOOKINGS,
    MANAGER_PERMISSIONS.MANAGE_BOOKINGS,
    MANAGER_PERMISSIONS.READ_CALENDAR,
    MANAGER_PERMISSIONS.MANAGE_CALENDAR,
  ],
  catalog: [
    MANAGER_PERMISSIONS.READ_SALON_INFO,
    MANAGER_PERMISSIONS.READ_SERVICES,
    MANAGER_PERMISSIONS.MANAGE_SERVICES,
    MANAGER_PERMISSIONS.READ_MASTERS,
    MANAGER_PERMISSIONS.MANAGE_MASTERS,
  ],
  full: Object.values(MANAGER_PERMISSIONS),
};

export function SalonTeamManagement({ salonId }: SalonTeamManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editPermissionsDialog, setEditPermissionsDialog] = useState<{
    open: boolean;
    manager?: SalonManager;
  }>({ open: false });
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [managerSearch, setManagerSearch] = useState("");

  // Fetch managers
  const { data: managers = [], isLoading } = useQuery<SalonManager[]>({
    queryKey: [`/api/owner/salons/${salonId}/managers`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/salons/${salonId}/managers`);
      return res.json();
    },
  });

  // Invite manager mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; permissions?: string[] }) => {
      const res = await apiRequest("POST", `/api/owner/salons/${salonId}/managers/invite`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/managers`] });
      toast({
        title: t("marketplace.team.inviteSuccess"),
        description: t("marketplace.team.inviteSent"),
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setSelectedPermissions(DEFAULT_PERMISSIONS);
    },
    onError: (error: any) => {
      toast({
        title: t("marketplace.common.error"),
        description: error.message || t("marketplace.team.inviteFailed"),
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      managerId,
      permissions,
    }: {
      managerId: string;
      permissions: string[];
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/owner/salons/${salonId}/managers/${managerId}/permissions`,
        {
          permissions,
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/managers`] });
      toast({
        title: t("marketplace.team.permissionsUpdated"),
      });
      setEditPermissionsDialog({ open: false });
    },
    onError: (error: any) => {
      toast({
        title: t("marketplace.common.error"),
        description: error.message || t("marketplace.team.updateFailed"),
        variant: "destructive",
      });
    },
  });

  // Revoke manager mutation
  const revokeMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const res = await apiRequest("DELETE", `/api/owner/salons/${salonId}/managers/${managerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salonId}/managers`] });
      toast({
        title: t("marketplace.team.managerRevoked"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("marketplace.common.error"),
        description: error.message || t("marketplace.team.revokeFailed"),
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({
        title: t("marketplace.common.error"),
        description: t("marketplace.team.invalidEmail"),
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      permissions: selectedPermissions,
    });
  };

  const handleUpdatePermissions = (manager: SalonManager, permissions: string[]) => {
    updatePermissionsMutation.mutate({
      managerId: manager.id,
      permissions,
    });
  };

  const handleRevoke = (managerId: string) => {
    if (confirm(t("marketplace.team.confirmRevoke"))) {
      revokeMutation.mutate(managerId);
    }
  };

  const togglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const getStatusBadge = (status: SalonManager["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("marketplace.team.status.active")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("marketplace.team.status.pending")}
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("marketplace.team.status.revoked")}
          </Badge>
        );
    }
  };

  const managerSummary = useMemo(() => {
    const active = managers.filter((manager) => manager.status === "active");
    const pending = managers.filter((manager) => manager.status === "pending");
    const revoked = managers.filter((manager) => manager.status === "revoked");
    const permissionCoverage = active.reduce((acc, manager) => acc + manager.permissions.length, 0);

    return {
      total: managers.length,
      active: active.length,
      pending: pending.length,
      revoked: revoked.length,
      permissionCoverage,
    };
  }, [managers]);

  const filteredManagers = useMemo(() => {
    const normalizedSearch = managerSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return managers;
    }

    return managers.filter((manager) => {
      const target = `${manager.fullName || ""} ${manager.email}`.toLowerCase();
      return target.includes(normalizedSearch);
    });
  }, [managerSearch, managers]);

  const applyPermissionPreset = (preset: keyof typeof PERMISSION_PRESETS) => {
    setSelectedPermissions(PERMISSION_PRESETS[preset]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{t("marketplace.team.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("marketplace.team.description")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={managerSearch}
              onChange={(event) => setManagerSearch(event.target.value)}
              placeholder="Поиск по имени или email"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("marketplace.team.inviteManager")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Активные</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{managerSummary.active}</p>
          <p className="mt-2 text-sm text-muted-foreground">Менеджеры с действующим доступом.</p>
        </Card>
        <Card className="border-border/70 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ожидают</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{managerSummary.pending}</p>
          <p className="mt-2 text-sm text-muted-foreground">Приглашения, которые ещё не приняли.</p>
        </Card>
        <Card className="border-border/70 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Отозваны</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{managerSummary.revoked}</p>
          <p className="mt-2 text-sm text-muted-foreground">История доступов без потери контроля.</p>
        </Card>
        <Card className="border-border/70 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Права</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{managerSummary.permissionCoverage}</p>
          <p className="mt-2 text-sm text-muted-foreground">Суммарно выданных разрешений по команде.</p>
        </Card>
      </div>

      {/* Managers List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("marketplace.common.loading")}
        </div>
      ) : managers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t("marketplace.team.noManagers")}</p>
          <Button onClick={() => setInviteDialogOpen(true)} variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            {t("marketplace.team.inviteFirstManager")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredManagers.length === 0 && (
            <Card className="border-dashed p-8 text-center">
              <p className="text-sm font-medium text-foreground">Ничего не найдено</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте другой email, имя менеджера или очистите поиск.
              </p>
            </Card>
          )}
          {filteredManagers.map((manager) => (
            <Card key={manager.id} className="p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground">
                        {manager.fullName || t("marketplace.team.unnamed")}
                      </h4>
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="break-all">{manager.email}</span>
                      </div>
                    </div>
                    {getStatusBadge(manager.status)}
                  </div>

                  {/* Permissions */}
                  <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span>
                        {t("marketplace.team.permissions")} ({manager.permissions.length})
                      </span>
                    </div>
                      <span className="text-xs uppercase tracking-[0.16em]">
                        {manager.status === "active"
                          ? "Рабочий доступ"
                          : manager.status === "pending"
                            ? "Ждёт активации"
                            : "История"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {manager.permissions.slice(0, 5).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {t(`marketplace.team.permission.${perm.replace("manager.", "")}`)}
                        </Badge>
                      ))}
                      {manager.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{manager.permissions.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      {t("marketplace.team.invitedAt")}:{" "}
                      {new Date(manager.invitedAt).toLocaleDateString()}
                    </div>
                    {manager.acceptedAt && (
                      <div>
                        {t("marketplace.team.acceptedAt")}:{" "}
                        {new Date(manager.acceptedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 xl:w-52 xl:justify-end">
                  {manager.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditPermissionsDialog({ open: true, manager });
                        setSelectedPermissions(manager.permissions);
                      }}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      {t("marketplace.team.editPermissions")}
                    </Button>
                  )}
                  {(manager.status === "active" || manager.status === "pending") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevoke(manager.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Отозвать
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.team.inviteManager")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">{t("marketplace.team.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="manager@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("marketplace.team.emailHint")}
              </p>
            </div>

            <div>
              <Label>{t("marketplace.team.selectPermissions")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("operations")}>
                  Операции
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("catalog")}>
                  Контент
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("full")}>
                  Полный доступ
                </Button>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {Object.entries(MANAGER_PERMISSIONS).map(([, value]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${value}`}
                      checked={selectedPermissions.includes(value)}
                      onCheckedChange={() => togglePermission(value)}
                    />
                    <label htmlFor={`perm-${value}`} className="text-sm cursor-pointer flex-1">
                      {t(`marketplace.team.permission.${value.replace("manager.", "")}`)}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("marketplace.team.permissionsHint")}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  {t("marketplace.team.inviteInfo")}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              {t("marketplace.common.cancel")}
            </Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending
                ? t("marketplace.common.sending")
                : t("marketplace.team.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog
        open={editPermissionsDialog.open}
        onOpenChange={(open) => setEditPermissionsDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.team.editPermissions")}</DialogTitle>
          </DialogHeader>

          {editPermissionsDialog.manager && (
            <div className="space-y-4">
              <div>
                <Label>{t("marketplace.team.managerDetails")}</Label>
                <div className="mt-2 text-sm">
                  <p className="font-medium">
                    {editPermissionsDialog.manager.fullName || t("marketplace.team.unnamed")}
                  </p>
                  <p className="text-muted-foreground">{editPermissionsDialog.manager.email}</p>
                </div>
              </div>

              <div>
                <Label>{t("marketplace.team.permissions")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("operations")}>
                    Операции
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("catalog")}>
                    Контент
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPermissionPreset("full")}>
                    Полный доступ
                  </Button>
                </div>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {Object.entries(MANAGER_PERMISSIONS).map(([, value]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-perm-${value}`}
                        checked={selectedPermissions.includes(value)}
                        onCheckedChange={() => togglePermission(value)}
                      />
                      <label
                        htmlFor={`edit-perm-${value}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {t(`marketplace.team.permission.${value.replace("manager.", "")}`)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPermissionsDialog({ open: false })}>
              {t("marketplace.common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (editPermissionsDialog.manager) {
                  handleUpdatePermissions(editPermissionsDialog.manager, selectedPermissions);
                }
              }}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending
                ? t("marketplace.common.saving")
                : t("marketplace.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
