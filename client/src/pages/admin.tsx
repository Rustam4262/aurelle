import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Store,
  Shield,
  MessageSquare,
  FileText,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminSalons from "@/pages/admin/salons";
import AdminComplaints from "@/pages/admin/complaints";
import AdminSanctions from "@/pages/admin/sanctions";
import AdminChat from "@/pages/admin/chat";
import AdminAudit from "@/pages/admin/audit";

// Navigation items
const getNavItems = (t: any) => [
  { path: "/admin/dashboard", label: t("admin.nav.dashboard"), icon: LayoutDashboard },
  { path: "/admin/users", label: t("admin.nav.users"), icon: Users },
  { path: "/admin/salons", label: t("admin.nav.salons"), icon: Store },
  { path: "/admin/complaints", label: t("admin.nav.complaints"), icon: AlertCircle },
  { path: "/admin/sanctions", label: t("admin.nav.sanctions"), icon: Shield },
  { path: "/admin/chat", label: t("admin.nav.chat"), icon: MessageSquare },
  { path: "/admin/audit", label: t("admin.nav.audit"), icon: FileText },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();
  const navItems = getNavItems(t);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-serif font-semibold text-foreground">AURELLE</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.title")}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Language and Theme Switchers */}
          <div className="flex items-center gap-2 mb-3">
            <LanguageSwitcher variant="outline" className="flex-1" />
            <ThemeToggle />
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
            {t("admin.logout")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Check if user is admin
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/auth");
      } else if (!user.isAdmin) {
        setLocation("/profile");
      }
    }
  }, [user, isLoading, setLocation]);

  // Redirect /admin to /admin/dashboard
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

  // Determine which component to show based on location
  let PageComponent = AdminDashboard;

  if (location === "/admin/users") PageComponent = AdminUsers;
  else if (location === "/admin/salons") PageComponent = AdminSalons;
  else if (location === "/admin/complaints") PageComponent = AdminComplaints;
  else if (location === "/admin/sanctions") PageComponent = AdminSanctions;
  else if (location === "/admin/chat") PageComponent = AdminChat;
  else if (location === "/admin/audit") PageComponent = AdminAudit;

  return (
    <AdminLayout>
      <PageComponent />
    </AdminLayout>
  );
}
