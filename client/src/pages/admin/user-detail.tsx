import { Link, useLocation } from "wouter";
import type { ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Shield,
  Store,
  Trash2,
  User,
} from "lucide-react";

interface UserDetail {
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    status: "active" | "blocked" | "deleted" | string;
    createdAt: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    blockReason?: string | null;
  };
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
    city: string | null;
    role: string | null;
    phone: string | null;
  } | null;
  roles: string[];
  ownedSalons: Array<{
    id: string;
    name: string | { en?: string; ru?: string; uz?: string };
    city: string | null;
    status: string | null;
    isVerified: boolean | null;
  }>;
  masterProfiles: Array<{
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    status: string | null;
    isSoloMaster: boolean | null;
  }>;
  recentBookings: Array<{
    id: string;
    bookingDate: string;
    startTime: string;
    status: string;
    priceSnapshot: number | null;
  }>;
}

interface ActivitySession {
  session: {
    id: string;
    loginAt: string;
    logoutAt: string | null;
    lastActivityAt: string;
    ipAddress: string | null;
    browser: string | null;
    os: string | null;
    durationSeconds: number | null;
    actionsCount: number | null;
  };
}

interface AuditItem {
  log: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress?: string | null;
    createdAt: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  deleted: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function localized(value: UserDetail["ownedSalons"][number]["name"]): string {
  if (!value) return "Без названия";
  if (typeof value === "string") return value;
  return value.ru || value.en || value.uz || "Без названия";
}

function dateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
}

function duration(seconds?: number | null): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function AdminUserDetail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const pathUserId = location.split("?")[0].replace("/admin/users/", "");
  const userId = decodeURIComponent(pathUserId);
  const encodedUserId = encodeURIComponent(userId);
  const detailKey = [`/api/admin/users/${encodedUserId}`];

  const { data, isLoading, error } = useQuery<UserDetail>({
    queryKey: detailKey,
    enabled: !!userId,
  });

  const sessionsQuery = useQuery<{ sessions: ActivitySession[] }>({
    queryKey: ["/api/admin/activity/sessions", { userId, limit: 10 }],
    enabled: !!userId,
  });

  const auditQuery = useQuery<{ logs: AuditItem[] }>({
    queryKey: ["/api/admin/audit", { actorUserId: userId, limit: 10 }],
    enabled: !!userId,
  });

  const blockMutation = useMutation({
    mutationFn: (reason: string) =>
      apiRequest("POST", `/api/admin/users/${encodedUserId}/block`, { reason }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      toast({ title: "Пользователь заблокирован" });
    },
    onError: (err: Error) => toast({ title: "Не удалось заблокировать", description: err.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/users/${encodedUserId}/unblock`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      toast({ title: "Пользователь разблокирован" });
    },
    onError: (err: Error) => toast({ title: "Не удалось разблокировать", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/users/${encodedUserId}`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Пользователь удалён" });
    },
    onError: (err: Error) => toast({ title: "Не удалось удалить", description: err.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/users/${encodedUserId}/restore`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey });
      toast({ title: "Пользователь восстановлен" });
    },
    onError: (err: Error) => toast({ title: "Не удалось восстановить", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="py-20 text-center text-muted-foreground">Пользователь не найден</div>;
  }

  const { user, profile, recentBookings, ownedSalons, masterProfiles, roles } = data;
  const displayName =
    profile?.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    userId.slice(-8);

  const isDeleted = user.status === "deleted";
  const isBlocked = user.status === "blocked";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold">{displayName}</h1>
            <p className="break-all font-mono text-sm text-muted-foreground">{user.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDeleted ? (
            <Button variant="outline" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Восстановить
            </Button>
          ) : isBlocked ? (
            <Button variant="outline" onClick={() => unblockMutation.mutate()} disabled={unblockMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Разблокировать
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => blockMutation.mutate("Admin action")} disabled={blockMutation.isPending}>
              <Ban className="mr-2 h-4 w-4" />
              Заблокировать
            </Button>
          )}
          {!isDeleted && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("Удалить пользователя? Это скроет связанные салоны/мастер-профили.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              {profile?.city && <p className="text-sm text-muted-foreground">{profile.city}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className={STATUS_COLORS[user.status] ?? ""}>{user.status}</Badge>
              {roles.map((role) => (
                <Badge key={role} variant="outline">{role}</Badge>
              ))}
            </div>

            <Separator />

            <div className="w-full space-y-2 text-left text-sm">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Телефон" value={profile?.phone || user.phoneNumber} />
              <InfoRow icon={Calendar} label="Регистрация" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("ru-RU") : null} />
              <InfoRow icon={Shield} label="Email verified" value={user.emailVerified ? "Да" : "Нет"} />
              <InfoRow icon={Shield} label="Phone verified" value={user.phoneVerified ? "Да" : "Нет"} />
              {user.blockReason && <InfoRow icon={Ban} label="Причина" value={user.blockReason} />}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <RelatedBusinessCard ownedSalons={ownedSalons} masterProfiles={masterProfiles} />
          <BookingsCard bookings={recentBookings} />
          <SessionsCard sessions={sessionsQuery.data?.sessions ?? []} loading={sessionsQuery.isLoading} />
          <AuditCard logs={auditQuery.data?.logs ?? []} loading={auditQuery.isLoading} onOpenAudit={() => setLocation(`/admin/audit?actorUserId=${encodedUserId}`)} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        <p className="break-words text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

function RelatedBusinessCard({ ownedSalons, masterProfiles }: Pick<UserDetail, "ownedSalons" | "masterProfiles">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Бизнес-связи
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Салоны владельца</p>
          {ownedSalons.length ? ownedSalons.map((salon) => (
            <div key={salon.id} className="mb-2 rounded-lg border p-3">
              <p className="font-medium">{localized(salon.name)}</p>
              <p className="text-sm text-muted-foreground">{[salon.city, salon.status].filter(Boolean).join(" · ") || "—"}</p>
              <Link href="/admin/salons">
                <Button variant="link" className="h-auto p-0 text-sm">Открыть список салонов</Button>
              </Link>
            </div>
          )) : <p className="text-sm text-muted-foreground">Нет салонов</p>}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Профили мастера</p>
          {masterProfiles.length ? masterProfiles.map((master) => (
            <div key={master.id} className="mb-2 rounded-lg border p-3">
              <p className="font-medium">{master.name}</p>
              <p className="text-sm text-muted-foreground">{[master.city, master.status, master.isSoloMaster ? "solo" : null].filter(Boolean).join(" · ") || "—"}</p>
              {master.slug ? (
                <Link href={`/master/${master.slug}`}>
                  <Button variant="link" className="h-auto p-0 text-sm">Открыть публичный профиль</Button>
                </Link>
              ) : null}
            </div>
          )) : <p className="text-sm text-muted-foreground">Нет мастер-профилей</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BookingsCard({ bookings }: { bookings: UserDetail["recentBookings"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Записи пользователя
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <User className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>Записей нет</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                    <TableCell>{new Date(booking.bookingDate).toLocaleDateString("ru-RU")} · {booking.startTime}</TableCell>
                    <TableCell><Badge className={BOOKING_STATUS_COLORS[booking.status] || ""} variant="secondary">{booking.status}</Badge></TableCell>
                    <TableCell>{booking.priceSnapshot?.toLocaleString("ru-RU") ?? 0} UZS</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsCard({ sessions, loading }: { sessions: ActivitySession[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">История сессий</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Загрузка...</p> : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сессий нет</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Вход</TableHead><TableHead>Выход</TableHead><TableHead>IP</TableHead><TableHead>Браузер</TableHead><TableHead>Длительность</TableHead></TableRow></TableHeader>
              <TableBody>{sessions.map(({ session }) => (
                <TableRow key={session.id}>
                  <TableCell>{dateTime(session.loginAt)}</TableCell>
                  <TableCell>{dateTime(session.logoutAt)}</TableCell>
                  <TableCell>{session.ipAddress || "—"}</TableCell>
                  <TableCell>{[session.browser, session.os].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell>{duration(session.durationSeconds)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditCard({ logs, loading, onOpenAudit }: { logs: AuditItem[]; loading: boolean; onOpenAudit: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Действия в аудите</CardTitle>
        <Button variant="outline" size="sm" onClick={onOpenAudit}>Открыть аудит</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Загрузка...</p> : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Действий нет</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Время</TableHead><TableHead>Действие</TableHead><TableHead>Объект</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
              <TableBody>{logs.map(({ log }) => (
                <TableRow key={log.id}>
                  <TableCell>{dateTime(log.createdAt)}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell>{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</TableCell>
                  <TableCell>{log.ipAddress || "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
