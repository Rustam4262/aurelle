import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Store,
  Shield,
  MessageSquare,
  Headphones,
  FileText,
  AlertCircle,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Command,
  PanelLeft,
  X,
  Bell,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock3,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminUserDetail = lazy(() => import("@/pages/admin/user-detail"));
const AdminSalons = lazy(() => import("@/pages/admin/salons"));
const AdminComplaints = lazy(() => import("@/pages/admin/complaints"));
const AdminSanctions = lazy(() => import("@/pages/admin/sanctions"));
const AdminChat = lazy(() => import("@/pages/admin/chat"));
const AdminSupport = lazy(() => import("@/pages/admin/support"));
const AdminAudit = lazy(() => import("@/pages/admin/audit"));
const AdminActivity = lazy(() => import("@/pages/admin/activity"));

const ROUTE_MAP = {
  "/admin/dashboard": AdminDashboard,
  "/admin/users": AdminUsers,
  "/admin/salons": AdminSalons,
  "/admin/activity": AdminActivity,
  "/admin/complaints": AdminComplaints,
  "/admin/sanctions": AdminSanctions,
  "/admin/chat": AdminChat,
  "/admin/support": AdminSupport,
  "/admin/audit": AdminAudit,
} as const;

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/admin/dashboard": {
    title: "РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ",
    description: "РљР»СЋС‡РµРІС‹Рµ РјРµС‚СЂРёРєРё, СЂРёСЃРєРё Рё СЃРѕСЃС‚РѕСЏРЅРёРµ РїР»Р°С‚С„РѕСЂРјС‹ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ.",
  },
  "/admin/users": {
    title: "РџРѕР»СЊР·РѕРІР°С‚РµР»Рё",
    description: "РџРѕРёСЃРє, РїСЂРѕРІРµСЂРєР° Рё СѓРїСЂР°РІР»РµРЅРёРµ Р°РєРєР°СѓРЅС‚Р°РјРё РєР»РёРµРЅС‚РѕРІ, РІР»Р°РґРµР»СЊС†РµРІ Рё РјР°СЃС‚РµСЂРѕРІ.",
  },
  "/admin/salons": {
    title: "РЎР°Р»РѕРЅС‹",
    description: "РњРѕРґРµСЂР°С†РёСЏ СЃР°Р»РѕРЅРѕРІ, РєРѕРЅС‚СЂРѕР»СЊ РїСѓР±Р»РёРєР°С†РёР№ Рё РєР°С‡РµСЃС‚РІР° РєР°СЂС‚РѕС‡РµРє.",
  },
  "/admin/activity": {
    title: "РђРєС‚РёРІРЅРѕСЃС‚СЊ",
    description: "Р›РµРЅС‚Р° СЃРѕР±С‹С‚РёР№, РґРµР№СЃС‚РІРёР№ Рё СЃРІРµР¶РёС… РёР·РјРµРЅРµРЅРёР№ РїРѕ РїР»Р°С‚С„РѕСЂРјРµ.",
  },
  "/admin/complaints": {
    title: "Р–Р°Р»РѕР±С‹",
    description: "РџСЂРёРѕСЂРёС‚РµС‚РЅС‹Рµ РѕР±СЂР°С‰РµРЅРёСЏ Рё РєРµР№СЃС‹, С‚СЂРµР±СѓСЋС‰РёРµ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.",
  },
  "/admin/sanctions": {
    title: "РЎР°РЅРєС†РёРё",
    description: "РђРєС‚РёРІРЅС‹Рµ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ, СЃСЂРѕРєРё Рё РєРѕРЅС‚СЂРѕР»СЊ СЂРёСЃРєРѕРІС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№.",
  },
  "/admin/support": {
    title: "РџРѕРґРґРµСЂР¶РєР°",
    description: "Р—Р°РїСЂРѕСЃС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№, РєРѕРјРјСѓРЅРёРєР°С†РёСЏ Рё СЃС‚Р°С‚СѓСЃ РѕР±СЂР°Р±РѕС‚РєРё РѕР±СЂР°С‰РµРЅРёР№.",
  },
  "/admin/chat": {
    title: "Р§Р°С‚",
    description: "Р Р°Р±РѕС‡Р°СЏ РєРѕРјРјСѓРЅРёРєР°С†РёСЏ Рё РѕРїРµСЂР°С‚РёРІРЅС‹Рµ РѕС‚РІРµС‚С‹ РІРЅСѓС‚СЂРё РїР»Р°С‚С„РѕСЂРјС‹.",
  },
  "/admin/audit": {
    title: "РђСѓРґРёС‚",
    description: "РЎРёСЃС‚РµРјРЅС‹Рµ РёР·РјРµРЅРµРЅРёСЏ, Р¶СѓСЂРЅР°Р» РґРµР№СЃС‚РІРёР№ Рё РєРѕРЅС‚СЂРѕР»СЊ РєСЂРёС‚РёС‡РЅС‹С… РѕРїРµСЂР°С†РёР№.",
  },
};

function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

interface ActionCenterData {
  unverifiedSalons: number;
  pendingComplaints: number;
  paymentErrors24h: number;
  expiringToday: number;
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
  badge?: number;
  searchTags?: string[];
}

interface NavGroup {
  groupKey: string | null;
  items: NavItem[];
}

interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  href: string;
  tone: string;
  count?: number;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

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

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-sidebar-collapsed", String(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

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
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setCommandOpen(true);
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
      groupKey: null,
      items: [
        { path: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard, searchTags: ["overview", "kpi", "metrics"] },
      ],
    },
    {
      groupKey: "users",
      items: [
        { path: "/admin/users", labelKey: "users", icon: Users, searchTags: ["accounts", "clients", "owners", "masters"] },
        { path: "/admin/salons", labelKey: "salons", icon: Store, searchTags: ["business", "moderation", "catalog"] },
        { path: "/admin/activity", labelKey: "activity", icon: Activity, searchTags: ["events", "feed", "logs"] },
      ],
    },
    {
      groupKey: "moderation",
      items: [
        {
          path: "/admin/complaints",
          labelKey: "complaints",
          icon: AlertCircle,
          badge: actionCenter?.pendingComplaints,
          searchTags: ["reports", "issues", "abuse"],
        },
        {
          path: "/admin/sanctions",
          labelKey: "sanctions",
          icon: Shield,
          badge: actionCenter?.expiringToday,
          searchTags: ["blocks", "restrictions", "risk"],
        },
      ],
    },
    {
      groupKey: "support",
      items: [
        { path: "/admin/support", labelKey: "support", icon: Headphones, searchTags: ["tickets", "help"] },
        { path: "/admin/chat", labelKey: "chat", icon: MessageSquare, searchTags: ["messages", "conversation"] },
      ],
    },
    {
      groupKey: "system",
      items: [
        { path: "/admin/audit", labelKey: "audit", icon: FileText, searchTags: ["history", "security", "journal"] },
      ],
    },
  ];

  const flatNavItems = navGroups.flatMap((group) => group.items);
  const routeMeta = isUserRoute(location)
    ? { title: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ", description: "РљР°СЂС‚РѕС‡РєР° Р°РєРєР°СѓРЅС‚Р°, РёСЃС‚РѕСЂРёСЏ Рё РґРµР№СЃС‚РІРёСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°." }
    : ROUTE_META[location] ?? ROUTE_META["/admin/dashboard"];

  const quickActions: QuickActionItem[] = useMemo(() => {
    const items: QuickActionItem[] = [
      {
        id: "complaints",
        label: "Р Р°Р·РѕР±СЂР°С‚СЊ Р¶Р°Р»РѕР±С‹",
        description: "РџРµСЂРµР№С‚Рё Рє СЃРІРµР¶РёРј РѕР±СЂР°С‰РµРЅРёСЏРј, РєРѕС‚РѕСЂС‹Рµ Р¶РґСѓС‚ СЂРµС€РµРЅРёСЏ.",
        href: "/admin/complaints",
        tone: "text-red-600 bg-red-500/10 border-red-500/20",
        count: actionCenter?.pendingComplaints,
      },
      {
        id: "salons",
        label: "РџСЂРѕРІРµСЂРёС‚СЊ СЃР°Р»РѕРЅС‹",
        description: "РћС‚РєСЂС‹С‚СЊ РјРѕРґРµСЂР°С†РёСЋ РЅРµРїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹С… СЃР°Р»РѕРЅРѕРІ.",
        href: "/admin/salons",
        tone: "text-orange-600 bg-orange-500/10 border-orange-500/20",
        count: actionCenter?.unverifiedSalons,
      },
      {
        id: "sanctions",
        label: "РЎР°РЅРєС†РёРё РЅР° СЃРµРіРѕРґРЅСЏ",
        description: "РџРѕСЃРјРѕС‚СЂРµС‚СЊ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ, РєРѕС‚РѕСЂС‹Рµ СЃРєРѕСЂРѕ РёСЃС‚РµРєР°СЋС‚.",
        href: "/admin/sanctions",
        tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
        count: actionCenter?.expiringToday,
      },
      {
        id: "payments",
        label: "РљРѕРЅС‚СЂРѕР»СЊ РїР»Р°С‚РµР¶РµР№",
        description: "Р’РµСЂРЅСѓС‚СЊСЃСЏ РЅР° РґР°С€Р±РѕСЂРґ Рё РїСЂРѕРІРµСЂРёС‚СЊ РїР»Р°С‚С‘Р¶РЅРѕРµ Р·РґРѕСЂРѕРІСЊРµ РїР»Р°С‚С„РѕСЂРјС‹.",
        href: "/admin/dashboard",
        tone: "text-rose-600 bg-rose-500/10 border-rose-500/20",
        count: actionCenter?.paymentErrors24h,
      },
    ];

    return items;
  }, [actionCenter]);

  const filteredCommandItems = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return flatNavItems;

    return flatNavItems.filter((item) => {
      const label = t(`admin.nav.${item.labelKey}`).toLowerCase();
      return (
        label.includes(query) ||
        item.path.toLowerCase().includes(query) ||
        item.searchTags?.some((tag) => tag.includes(query))
      );
    });
  }, [commandQuery, flatNavItems, t]);

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

  const SidebarContent = (
    <>
      <div className={`border-b border-border flex items-center ${collapsed ? "justify-center p-4 h-[76px]" : "p-5 h-[76px]"}`}>
        {collapsed ? (
          <span className="text-xl font-serif font-semibold text-foreground">A</span>
        ) : (
          <div>
            <h1 className="text-xl font-serif font-semibold text-foreground leading-none">AURELLE</h1>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.title") || "Admin Console"}</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-3">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {group.groupKey && !collapsed && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {t(`admin.navGroup.${group.groupKey}`)}
                </p>
              )}
              {group.groupKey && collapsed && gi > 0 && <div className="mx-3 my-2 border-t border-border/60" />}

              <div className="px-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  const showBadge = (item.badge ?? 0) > 0;

                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        className={`relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm select-none transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                      >
                        <div className="relative shrink-0">
                          <Icon className="h-4 w-4" />
                          {collapsed && showBadge && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />}
                        </div>

                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{t(`admin.nav.${item.labelKey}`)}</span>
                            {showBadge && (
                              <Badge variant={isActive ? "secondary" : "destructive"} className="ml-auto flex h-5 min-w-[20px] items-center justify-center px-1.5 text-xs">
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
        onClick={toggleCollapse}
        className="hidden items-center justify-center border-t border-border/60 py-2 text-muted-foreground transition-colors hover:text-foreground md:flex"
        title={collapsed ? "Р Р°Р·РІРµСЂРЅСѓС‚СЊ" : "РЎРІРµСЂРЅСѓС‚СЊ"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <div className="flex items-center gap-2 px-4 py-0.5 text-xs">
            <ChevronLeft className="h-4 w-4" />
            <span>РЎРІРµСЂРЅСѓС‚СЊ</span>
          </div>
        )}
      </button>

      <div className={`border-t border-border ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">{user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin"}
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
              {t("admin.logout")}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-medium text-primary">{user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}</span>
            </div>
            <ThemeToggle />
            <button onClick={() => logout()} className="text-muted-foreground transition-colors hover:text-foreground" title={t("admin.logout")}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className={`${collapsed ? "md:w-16" : "md:w-72"} hidden border-r border-border bg-card md:flex md:shrink-0 md:flex-col md:transition-all md:duration-200`}>
        {SidebarContent}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-[320px] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <h2 className="font-serif text-lg font-semibold">AURELLE</h2>
                <p className="text-xs text-muted-foreground">Admin Console</p>
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
        <div className="border-b border-border/70 bg-background/92">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 border border-primary/10 bg-primary/5 text-xs text-primary">
                      <Sparkles className="h-3 w-3" />
                      Admin workspace
                    </Badge>
                    {totalAttentionCount > 0 && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Bell className="h-3 w-3" />
                        {totalAttentionCount} С‚СЂРµР±СѓСЋС‚ РІРЅРёРјР°РЅРёСЏ
                      </Badge>
                    )}
                  </div>
                  <h1 className="mt-2 text-[1.75rem] font-serif font-semibold tracking-tight">{routeMeta.title}</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{routeMeta.description}</p>
                </div>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <LanguageSwitcher variant="outline" className="h-10" />
                <ThemeToggle />
                <Button variant="outline" className="gap-2" onClick={() => refetchActionCenter()} disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  РћР±РЅРѕРІРёС‚СЊ
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setCommandOpen(true);
                }}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 shadow-sm"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onFocus={() => setCommandOpen(true)}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  placeholder="Р‘С‹СЃС‚СЂС‹Р№ РїРѕРёСЃРє РїРѕ СЂР°Р·РґРµР»Р°Рј РёР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РїРѕ email/С‚РµР»РµС„РѕРЅСѓ"
                />
                <Badge variant="outline" className="hidden gap-1 sm:flex">
                  <Command className="h-3 w-3" />
                  Ctrl K
                </Badge>
              </form>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLocation(item.href)}
                    className={`rounded-2xl border px-4 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-lg font-bold tabular-nums">{item.count ?? 0}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-foreground/70 dark:text-white/70">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Р РµР°РіРёСЂСѓР№С‚Рµ РЅР° Р¶Р°Р»РѕР±С‹ Рё СЃР°РЅРєС†РёРё РІ РїРµСЂРІСѓСЋ РѕС‡РµСЂРµРґСЊ
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Р‘С‹СЃС‚СЂС‹Р№ РїРѕРёСЃРє РІРµРґС‘С‚ РІ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ РїСЂРµРґР·Р°РїРѕР»РЅРµРЅРЅС‹Рј С„РёР»СЊС‚СЂРѕРј
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Р‘С‹СЃС‚СЂС‹Рµ РґРµР№СЃС‚РІРёСЏ</DialogTitle>
            <DialogDescription>
              РџРµСЂРµС…РѕРґРёС‚Рµ РјРµР¶РґСѓ СЂР°Р·РґРµР»Р°РјРё Рё РёС‰РёС‚Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РїРѕ email, С‚РµР»РµС„РѕРЅСѓ РёР»Рё РёРјРµРЅРё.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="РќР°РїСЂРёРјРµСЂ: РїРѕР»СЊР·РѕРІР°С‚РµР»Рё, Р¶Р°Р»РѕР±С‹, salon, +998..."
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-2xl border border-border">
                <div className="border-b border-border px-4 py-3 text-sm font-medium">Р Р°Р·РґРµР»С‹</div>
                <ScrollArea className="h-[320px]">
                  <div className="space-y-1 p-2">
                    {filteredCommandItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;

                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setLocation(item.path);
                            setCommandOpen(false);
                            setCommandQuery("");
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                            isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{t(`admin.nav.${item.labelKey}`)}</p>
                            <p className={`truncate text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{item.path}</p>
                          </div>
                          {(item.badge ?? 0) > 0 && <Badge variant={isActive ? "secondary" : "destructive"}>{item.badge}</Badge>}
                        </button>
                      );
                    })}
                    {filteredCommandItems.length === 0 && (
                      <div className="px-3 py-6 text-sm text-muted-foreground">РџРѕ СЂР°Р·РґРµР»Р°Рј СЃРѕРІРїР°РґРµРЅРёР№ РЅРµС‚. РњРѕР¶РЅРѕ РІС‹РїРѕР»РЅРёС‚СЊ РїРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ СЃРїСЂР°РІР°.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">РџРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Р’РІРµРґРёС‚Рµ email, С‚РµР»РµС„РѕРЅ РёР»Рё РёРјСЏ, Рё РјС‹ СЃСЂР°Р·Сѓ РѕС‚РєСЂРѕРµРј С‚Р°Р±Р»РёС†Сѓ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ СЌС‚РёРј С„РёР»СЊС‚СЂРѕРј.
                </p>
                <Button className="mt-4 w-full" onClick={handleOpenUsersSearch}>
                  РћС‚РєСЂС‹С‚СЊ РїРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
                </Button>

                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Р‘С‹СЃС‚СЂС‹Рµ РїСЂРёРѕСЂРёС‚РµС‚С‹</p>
                  {quickActions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setLocation(item.href);
                        setCommandOpen(false);
                        setCommandQuery("");
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span>{item.label}</span>
                      <Badge variant="secondary">{item.count ?? 0}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isUserRoute(path: string) {
  return /^\/admin\/users\/.+/.test(path);
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
