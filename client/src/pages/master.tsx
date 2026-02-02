import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMasterData } from "@/hooks/use-master-data";
import { useMasterMutations } from "@/hooks/use-master-mutations";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowLeft,
  Calendar,
  Users,
  Store,
  LogOut,
  CalendarDays,
  Image as ImageIcon,
  BarChart3,
  Loader2,
  CalendarCheck,
} from "lucide-react";

// Sub-components
import { MasterOverview } from "@/components/master/MasterOverview";
import { MasterNotifications } from "@/components/master/MasterNotifications";
import { MasterSchedule } from "@/components/master/MasterSchedule";
import { MasterBookings } from "@/components/master/MasterBookings";
import { MasterCalendarTab } from "@/components/master/MasterCalendarTab";
import { MasterPortfolioTab } from "@/components/master/MasterPortfolio";
import { MasterAnalytics } from "@/components/master/MasterAnalytics";

export default function MasterPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Custom Hooks
  const {
    masterQuery,
    statsQuery,
    scheduleQuery,
    bookingsQuery,
    portfolioQuery,
    notificationsQuery,
    isLoading: dataLoading,
  } = useMasterData(activeTab);

  const {
    markNotificationReadMutation,
    markAllNotificationsReadMutation,
    updateBookingStatusMutation,
    saveScheduleMutation,
  } = useMasterMutations();

  // Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCancelBooking = () => {
    if (cancelBookingId) {
      updateBookingStatusMutation.mutate({
        bookingId: cancelBookingId,
        status: "cancelled",
        cancellationReason: cancelReason,
      });
      setCancelDialogOpen(false);
      setCancelBookingId(null);
      setCancelReason("");
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!masterQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="font-serif text-xl text-foreground">
                {t("marketplace.master.title")}
              </h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.master.title")}
            </h2>
            <p className="text-muted-foreground mb-6">{t("marketplace.master.noAccount")}</p>
            <Link href="/">
              <Button>{t("marketplace.master.backHome")}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { master, salon, bookings, reviews } = masterQuery.data;
  const unreadCount = notificationsQuery.data?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-xl text-foreground">
                  {t("marketplace.master.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("marketplace.master.welcome")}, {master.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <MasterNotifications
                notifications={notificationsQuery.data}
                unreadCount={unreadCount}
                onMarkRead={(id) => markNotificationReadMutation.mutate(id)}
                onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
                onViewBookings={() => setActiveTab("bookings")}
              />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview">
              <Store className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.schedule")}</span>
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.bookings")}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarCheck className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.calendar.title")}</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <ImageIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.portfolio")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("marketplace.master.tabs.analytics")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterOverview
              master={master}
              salon={salon}
              bookings={bookingsQuery.data || []}
              reviews={reviews}
              stats={statsQuery.data}
            />
          </TabsContent>

          <TabsContent
            value="schedule"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterSchedule
              initialSchedule={scheduleQuery.data}
              onSave={(s) => saveScheduleMutation.mutate(s)}
              isSaving={saveScheduleMutation.isPending}
              isLoading={scheduleQuery.isLoading}
            />
          </TabsContent>

          <TabsContent
            value="bookings"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterBookings
              bookings={bookingsQuery.data || []}
              isLoading={bookingsQuery.isLoading}
              onConfirm={(id) =>
                updateBookingStatusMutation.mutate({ bookingId: id, status: "confirmed" })
              }
              onComplete={(id) =>
                updateBookingStatusMutation.mutate({ bookingId: id, status: "completed" })
              }
              onCancel={(id) => {
                setCancelBookingId(id);
                setCancelDialogOpen(true);
              }}
              isUpdating={updateBookingStatusMutation.isPending}
            />
          </TabsContent>

          <TabsContent
            value="calendar"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterCalendarTab
              bookings={bookingsQuery.data || []}
              isLoading={bookingsQuery.isLoading}
            />
          </TabsContent>

          <TabsContent
            value="portfolio"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterPortfolioTab
              masterId={user.id}
              masterName={master.name}
              portfolio={portfolioQuery.data}
              isLoading={portfolioQuery.isLoading}
              onRefresh={() => masterQuery.refetch()}
            />
          </TabsContent>

          <TabsContent
            value="analytics"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <MasterAnalytics stats={statsQuery.data} isLoading={statsQuery.isLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.master.cancelBooking")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("marketplace.master.cancelReasonPlaceholder")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              {t("marketplace.master.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={updateBookingStatusMutation.isPending}
            >
              {t("marketplace.master.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
