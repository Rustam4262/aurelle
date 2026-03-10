import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Ban,
  CheckCircle,
  User,
  Clock,
} from "lucide-react";

interface UserDetail {
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
    createdAt: string | null;
  };
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
    city: string | null;
    role: string | null;
    phone: string | null;
  } | null;
  recentBookings: {
    id: string;
    bookingDate: string;
    startTime: string;
    status: string;
    priceSnapshot: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inactive: "bg-gray-100 text-gray-800",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminUserDetail() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const userId = location.replace("/admin/users/", "");

  const { data, isLoading, error } = useQuery<UserDetail>({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !!userId,
  });

  const blockMutation = useMutation({
    mutationFn: (reason: string) =>
      apiRequest("POST", `/api/admin/users/${userId}/block`, { reason }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      toast({ title: t("common.success") });
    },
    onError: () => toast({ title: t("common.error"), variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/users/${userId}/unblock`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      toast({ title: t("common.success") });
    },
    onError: () => toast({ title: t("common.error"), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {t("admin.users.notFound", "Пользователь не найден")}
      </div>
    );
  }

  const { user, profile, recentBookings } = data;
  const displayName =
    profile?.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    userId.slice(-8);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{displayName}</p>
              {profile?.city && (
                <p className="text-sm text-muted-foreground">{profile.city}</p>
              )}
            </div>
            <Badge className={STATUS_COLORS[user.status ?? "inactive"]}>
              {user.status ?? "unknown"}
            </Badge>
            <Badge variant="outline">{profile?.role ?? "client"}</Badge>

            <div className="w-full space-y-2 text-left text-sm">
              {user.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {(profile?.phone || user.phoneNumber) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{profile?.phone || user.phoneNumber}</span>
                </div>
              )}
              {user.createdAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="w-full space-y-2">
              {user.status === "active" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => blockMutation.mutate("Admin action")}
                  disabled={blockMutation.isPending}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t("admin.users.actions.blockUser", "Заблокировать")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => unblockMutation.mutate()}
                  disabled={unblockMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("admin.users.actions.unblockUser", "Разблокировать")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent bookings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              {t("admin.users.recentBookings", "Последние записи")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{t("admin.users.noBookings", "Записей нет")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-md"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm">
                        {new Date(b.bookingDate).toLocaleDateString("ru-RU")} — {b.startTime}
                      </p>
                      <p className="text-sm font-medium">{b.priceSnapshot?.toLocaleString()} UZS</p>
                    </div>
                    <Badge className={BOOKING_STATUS_COLORS[b.status] || ""} variant="secondary">
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
