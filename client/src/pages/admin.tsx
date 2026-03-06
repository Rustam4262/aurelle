import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  Store,
  Shield,
  MessageSquare,
  FileText,
  AlertCircle,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

// Each admin sub-page is a separate async chunk — loaded on first navigation to that route.
// recharts (~200 KB gz) is pulled in only by dashboard; xlsx+jspdf only by users.
const AdminDashboard  = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers      = lazy(() => import("@/pages/admin/users"));
const AdminSalons     = lazy(() => import("@/pages/admin/salons"));
const AdminComplaints = lazy(() => import("@/pages/admin/complaints"));
const AdminSanctions  = lazy(() => import("@/pages/admin/sanctions"));
const AdminChat       = lazy(() => import("@/pages/admin/chat"));
const AdminAudit      = lazy(() => import("@/pages/admin/audit"));
const AdminActivity   = lazy(() => import("@/pages/admin/activity"));

// Route → component map (declared at module level — one instance, never re-created on render)
const ROUTE_MAP = {
  "/admin/dashboard":  AdminDashboard,
  "/admin/users":      AdminUsers,
  "/admin/salons":     AdminSalons,
  "/admin/activity":   AdminActivity,
  "/admin/complaints": AdminComplaints,
  "/admin/sanctions":  AdminSanctions,
  "/admin/chat":       AdminChat,
  "/admin/audit":      AdminAudit,
} as const;

// Generic skeleton shown while a sub-page chunk is loading for the first time
function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface NavGroup {
  groupKey: string | null;
  items: NavItem[];
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  // Sidebar collapse — persisted to localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-sidebar-collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Action-center badge counts (shared cache with dashboard page)
  const { data: actionCenter } = useQuery<ActionCenterData>({
    queryKey: ["/api/admin/dashboard/action-center"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Build grouped navigation
  const navGroups: NavGroup[] = [
    {
      groupKey: null,
      items: [
        { path: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      ],
    },
    {
      groupKey: "users",
      items: [
        { path: "/admin/users",    labelKey: "users",    icon: Users },
        { path: "/admin/salons",   labelKey: "salons",   icon: Store },
        { path: "/admin/activity", labelKey: "activity", icon: Activity },
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
        },
        {
          path: "/admin/sanctions",
          labelKey: "sanctions",
          icon: Shield,
          badge: actionCenter?.expiringToday,
        },
      ],
    },
    {
      groupKey: "support",
      items: [
        { path: "/admin/chat", labelKey: "chat", icon: MessageSquare },
      ],
    },
    {
      groupKey: "system",
      items: [
        { path: "/admin/audit", labelKey: "audit", icon: FileText },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } bg-card border-r border-border flex flex-col transition-all duration-200 shrink-0`}
      >
        {/* Logo */}
        <div
          className={`border-b border-border flex items-center ${
            collapsed ? "justify-center p-4 h-[73px]" : "p-5 h-[73px]"
          }`}
        >
          {collapsed ? (
            <span className="text-xl font-serif font-semibold text-foreground">A</span>
          ) : (
            <div>
              <h1 className="text-xl font-serif font-semibold text-foreground leading-none">
                AURELLE
              </h1>
              <p className="text-xs text-muted-foreground mt-1">{t("admin.title")}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {/* Group label */}
              {group.groupKey && !collapsed && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {t(`admin.navGroup.${group.groupKey}`)}
                </p>
              )}
              {group.groupKey && collapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t border-border/60" />
              )}

              {/* Items */}
              <div className="px-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  const showBadge = (item.badge ?? 0) > 0;

                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        className={`relative flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm select-none ${
                          isActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                      >
                        <div className="relative shrink-0">
                          <Icon className="h-4 w-4" />
                          {/* Red dot badge when collapsed */}
                          {collapsed && showBadge && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>

                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">
                              {t(`admin.nav.${item.labelKey}`)}
                            </span>
                            {showBadge && (
                              <Badge
                                variant="destructive"
                                className="ml-auto text-xs px-1.5 min-w-[20px] h-5 flex items-center justify-center"
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
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="flex items-center justify-center py-2 text-muted-foreground hover:text-foreground transition-colors border-t border-border/60"
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 text-xs px-4 py-0.5">
              <ChevronLeft className="h-4 w-4" />
              <span>Свернуть</span>
            </div>
          )}
        </button>

        {/* User profile footer */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "p-4"}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.firstName
                      ? `${user.firstName} ${user.lastName || ""}`.trim()
                      : "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <LanguageSwitcher variant="outline" className="flex-1 h-8 text-xs" />
                <ThemeToggle />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 h-8 text-xs"
                onClick={() => logout()}
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("admin.logout")}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}
                </span>
              </div>
              <ThemeToggle />
              <button
                onClick={() => logout()}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t("admin.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  const PageComponent = ROUTE_MAP[location as keyof typeof ROUTE_MAP] ?? AdminDashboard;

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
