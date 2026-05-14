import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Command,
  CreditCard,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeft,
  RefreshCw,
  Scissors,
  Search,
  Shield,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminUserDetail = lazy(() => import("@/pages/admin/user-detail"));
const AdminSalons = lazy(() => import("@/pages/admin/salons"));
const AdminServices = lazy(() => import("@/pages/admin/services"));
const AdminComplaints = lazy(() => import("@/pages/admin/complaints"));
const AdminSanctions = lazy(() => import("@/pages/admin/sanctions"));
const AdminChat = lazy(() => import("@/pages/admin/chat"));
const AdminSupport = lazy(() => import("@/pages/admin/support"));
const AdminAudit = lazy(() => import("@/pages/admin/audit"));
const AdminActivity = lazy(() => import("@/pages/admin/activity"));
const AdminBilling = lazy(() => import("@/pages/admin/billing"));

const ROUTE_MAP = {
  "/admin/dashboard": AdminDashboard,
  "/admin/users": AdminUsers,
  "/admin/salons": AdminSalons,
  "/admin/services": AdminServices,
  "/admin/activity": AdminActivity,
  "/admin/complaints": AdminComplaints,
  "/admin/sanctions": AdminSanctions,
  "/admin/chat": AdminChat,
  "/admin/support": AdminSupport,
  "/admin/audit": AdminAudit,
  "/admin/billing": AdminBilling,
} as const;

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/admin/dashboard": {
    title: "Панель управления",
    description: "Главные сигналы бизнеса, риски и очередь действий в одном месте.",
  },
  "/admin/users": {
    title: "Пользователи",
    description: "Клиенты, мастера и владельцы с быстрыми действиями и поиском по аккаунтам.",
  },
  "/admin/salons": {
    title: "Бизнес",
    description: "Салоны, публикации и статусы верификации, которые влияют на доверие к платформе.",
  },
  "/admin/services": {
    title: "Услуги",
    description: "Единый каталог услуг салонов, владельцев и фриланс-мастеров.",
  },
  "/admin/billing": {
    title: "Биллинг",
    description: "Комиссии, GMV, выручка и сверка платежей по платформе.",
  },
  "/admin/activity": {
    title: "Активность",
    description: "Живая лента изменений по платформе: события, действия и свежие сигналы команды.",
  },
  "/admin/complaints": {
    title: "Модерация жалоб",
    description: "Очередь кейсов, по которым администратору нужно принять решение без лишнего шума.",
  },
  "/admin/sanctions": {
    title: "Санкции",
    description: "Ограничения, сроки действия и риск-профиль пользователей, требующих контроля.",
  },
  "/admin/support": {
    title: "Обращения",
    description: "Поддержка пользователей и системные запросы, которые важно не терять из фокуса.",
  },
  "/admin/chat": {
    title: "Коммуникации",
    description: "Рабочие переписки и быстрый контакт с пользователями внутри платформы.",
  },
  "/admin/audit": {
    title: "Система",
    description: "Журнал аудита и история критичных изменений, важных для контроля и безопасности.",
  },
};

interface ActionCenterData {
  unverifiedSalons: number;
  pendingComplaints: number;
  paymentErrors24h: number;
  expiringToday: number;
}

interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: number;
  searchTags?: string[];
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

function isUserRoute(path: string) {
  return /^\/admin\/users\/.+/.test(path);
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const { data: actionCenter, refetch: refetchActionCenter, isFetching } = useQuery<ActionCenterData>({
    queryKey: ["/api/admin/dashboard/action-center"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  const navGroups: NavGroup[] = [
    {
      items: [
        {
          path: "/admin/dashboard",
          label: "Dashboard",
          description: "Главный экран бизнеса и рисков",
          icon: LayoutDashboard,
          searchTags: ["главная", "control center", "kpi", "риски"],
        },
      ],
    },
    {
      heading: "Пользователи",
      items: [
        {
          path: "/admin/users",
          label: "Все аккаунты",
          description: "Клиенты, мастера и владельцы",
          icon: Users,
          searchTags: ["клиенты", "мастера", "владельцы", "users"],
        },
      ],
    },
    {
      heading: "Бизнес",
      items: [
        {
          path: "/admin/salons",
          label: "Салоны и услуги",
          description: "Каталог, верификация и публикации",
          icon: Store,
          badge: actionCenter?.unverifiedSalons,
          searchTags: ["salons", "catalog", "верификация"],
        },
      ],
    },
    {
      heading: "Модерация",
      items: [
        {
          path: "/admin/complaints",
          label: "Жалобы",
          description: "Кейсы, требующие решения",
          icon: AlertCircle,
          badge: actionCenter?.pendingComplaints,
          searchTags: ["жалобы", "abuse", "reports"],
        },
        {
          path: "/admin/sanctions",
          label: "Санкции",
          description: "Блокировки, ограничения и сроки",
          icon: Shield,
          badge: actionCenter?.expiringToday,
          searchTags: ["санкции", "blocks", "risk"],
        },
      ],
    },
    {
      heading: "Коммуникации",
      items: [
        {
          path: "/admin/support",
          label: "Обращения",
          description: "Запросы пользователей и поддержка",
          icon: Headphones,
          searchTags: ["support", "tickets", "обращения"],
        },
        {
          path: "/admin/chat",
          label: "Чат",
          description: "Оперативная коммуникация",
          icon: MessageSquare,
          searchTags: ["chat", "messages", "коммуникации"],
        },
      ],
    },
    {
      heading: "Система",
      items: [
        {
          path: "/admin/activity",
          label: "Активность",
          description: "Лента последних событий",
          icon: Activity,
          searchTags: ["activity", "feed", "events"],
        },
        {
          path: "/admin/audit",
          label: "Аудит",
          description: "Журнал критичных действий",
          icon: FileText,
          searchTags: ["audit", "logs", "security"],
        },
      ],
    },
  ];

  navGroups.splice(3, 0, {
    heading: "Business tools",
    items: [
      {
        path: "/admin/services",
        label: "Услуги",
        description: "Все услуги салонов и фриланс-мастеров",
        icon: Scissors,
        searchTags: ["services", "услуги", "masters", "salons"],
      },
      {
        path: "/admin/billing",
        label: "Биллинг",
        description: "GMV, комиссии и сверка платежей",
        icon: CreditCard,
        badge: actionCenter?.paymentErrors24h,
        searchTags: ["billing", "payments", "gmv", "финансы"],
      },
    ],
  });

  const flatNavItems = navGroups.flatMap((group) => group.items);
  const filteredCommandItems = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return flatNavItems;

    return flatNavItems.filter((item) => {
      const haystack = [item.label, item.description, item.path, ...(item.searchTags ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [commandQuery, flatNavItems]);

  const totalAttentionCount =
    (actionCenter?.unverifiedSalons ?? 0) +
    (actionCenter?.pendingComplaints ?? 0) +
    (actionCenter?.paymentErrors24h ?? 0) +
    (actionCenter?.expiringToday ?? 0);

  const handleOpenUsersSearch = () => {
    const query = commandQuery.trim();
    setCommandOpen(false);
    setCommandQuery("");
    setLocation(query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users");
  };

  const routeMeta = isUserRoute(location)
    ? {
        title: "Карточка пользователя",
        description: "История аккаунта, статусы и точечные действия администратора.",
      }
    : ROUTE_META[location] ?? ROUTE_META["/admin/dashboard"];

  const SidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`border-b border-border/70 ${collapsed ? "px-3 py-5" : "px-5 py-5"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-serif text-xl font-semibold leading-none text-foreground">AURELLE</p>
              <p className="mt-1 text-xs text-muted-foreground">Admin control center</p>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.heading ?? "dashboard"} className="mb-4 last:mb-0">
              {group.heading && !collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {group.heading}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  const hasBadge = (item.badge ?? 0) > 0;

                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                      >
                        <div className="relative shrink-0">
                          <Icon className="h-4 w-4" />
                          {collapsed && hasBadge && (
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                          )}
                        </div>

                        {!collapsed && (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{item.label}</p>
                              <p
                                className={`truncate text-xs ${
                                  isActive ? "text-primary-foreground/75" : "text-muted-foreground/75"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                            {hasBadge && (
                              <Badge
                                variant={isActive ? "secondary" : "destructive"}
                                className="min-w-[22px] justify-center px-1.5 text-[11px]"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <button
        onClick={() => {
          setCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem("admin-sidebar-collapsed", String(next));
            } catch {
              // ignore localStorage errors
            }
            return next;
          });
        }}
        className="hidden items-center justify-center border-t border-border/70 py-2 text-muted-foreground transition-colors hover:text-foreground md:flex"
        title={collapsed ? "Развернуть меню" : "Свернуть меню"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <ChevronLeft className="h-4 w-4" />
            <span>Свернуть</span>
          </div>
        )}
      </button>

      <div className={`mt-auto shrink-0 border-t border-border/70 ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Администратор"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <LanguageSwitcher variant="outline" className="h-8 flex-1 text-xs" />
              <ThemeToggle />
            </div>
            <Button variant="outline" size="sm" className="h-8 w-full gap-2 text-xs" onClick={() => logout()}>
              <LogOut className="h-3.5 w-3.5" />
              Выйти
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}
            </div>
            <ThemeToggle />
            <button
              onClick={() => logout()}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-card/95 backdrop-blur md:flex md:flex-col ${
          collapsed ? "md:w-20" : "md:w-80"
        } md:transition-all md:duration-200`}
      >
        {SidebarContent}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex h-screen w-[90%] max-w-[340px] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-serif text-lg font-semibold leading-none">AURELLE</p>
                  <p className="text-xs text-muted-foreground">Admin control center</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className="border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1 border border-primary/10 bg-primary/5 text-primary">
                        <Sparkles className="h-3 w-3" />
                        Рабочее место администратора
                      </Badge>
                      {totalAttentionCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <Bell className="h-3 w-3" />
                          {totalAttentionCount} требуют внимания
                        </Badge>
                      )}
                    </div>
                    <h1 className="mt-3 text-[1.9rem] font-serif font-semibold tracking-tight">{routeMeta.title}</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{routeMeta.description}</p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  <LanguageSwitcher variant="outline" className="h-10" />
                  <ThemeToggle />
                  <Button variant="outline" className="gap-2" onClick={() => refetchActionCenter()} disabled={isFetching}>
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Обновить
                  </Button>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setCommandOpen(true);
                }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/80 px-4 py-3 shadow-sm"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onFocus={() => setCommandOpen(true)}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  placeholder="Быстрый поиск по разделам или пользователям по email и телефону"
                />
                <Badge variant="outline" className="hidden gap-1 sm:flex">
                  <Command className="h-3 w-3" />
                  Ctrl K
                </Badge>
                <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Быстрые переходы</DialogTitle>
            <DialogDescription>
              Открой нужный раздел или сразу перейди в пользователей с подготовленным поисковым запросом.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="Например: жалобы, salons, malika@gmail.com, +998..."
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-4 py-3 text-sm font-medium">Разделы</div>
                <ScrollArea className="h-[320px]">
                  <div className="space-y-1 p-2">
                    {filteredCommandItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;
                      const hasBadge = (item.badge ?? 0) > 0;

                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setLocation(item.path);
                            setCommandOpen(false);
                            setCommandQuery("");
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                            isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.label}</p>
                            <p className={`truncate text-xs ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                              {item.description}
                            </p>
                          </div>
                          {hasBadge && <Badge variant={isActive ? "secondary" : "destructive"}>{item.badge}</Badge>}
                        </button>
                      );
                    })}
                    {filteredCommandItems.length === 0 && (
                      <div className="px-3 py-6 text-sm text-muted-foreground">
                        Ничего не найдено по разделам. Можно сразу открыть поиск по пользователям справа.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">Поиск пользователя</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Введи email, телефон или имя, и мы откроем раздел пользователей с готовым фильтром.
                </p>
                <Button className="mt-4 w-full" onClick={handleOpenUsersSearch}>
                  Открыть поиск пользователей
                </Button>

                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Приоритет сейчас</p>
                  {flatNavItems
                    .filter((item) => (item.badge ?? 0) > 0)
                    .slice(0, 4)
                    .map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          setLocation(item.path);
                          setCommandOpen(false);
                          setCommandQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span>{item.label}</span>
                        <Badge variant="destructive">{item.badge}</Badge>
                      </button>
                    ))}
                  {!flatNavItems.some((item) => (item.badge ?? 0) > 0) && (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                      Срочных разделов сейчас нет. Можно идти через обычную навигацию.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/auth");
      } else if (!user.isAdmin) {
        setLocation("/profile");
      }
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (location === "/admin") {
      setLocation("/admin/dashboard");
    }
  }, [location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  const isUserDetailRoute = isUserRoute(location);
  const PageComponent = isUserDetailRoute ? AdminUserDetail : (ROUTE_MAP[location as keyof typeof ROUTE_MAP] ?? AdminDashboard);

  return (
    <AdminLayout>
      <ErrorBoundary key={location}>
        <Suspense fallback={<AdminPageSkeleton />}>
          <PageComponent />
        </Suspense>
      </ErrorBoundary>
    </AdminLayout>
  );
}
