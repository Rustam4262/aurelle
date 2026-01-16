import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, AlertCircle, Store, Scissors, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

interface DashboardOverview {
  today: {
    revenue: number;
    bookings: number;
    newClients: number;
    completionRate: number;
  };
  week: {
    revenue: number;
    revenueChange: number;
    bookings: number;
    bookingsChange: number;
  };
  month: {
    revenue: number;
    bookings: number;
    topServices: Array<{ id: string; name: any; count: number }>;
    topMasters: Array<{ id: string; name: string; revenue: number }>;
  };
}

interface DashboardAlert {
  type: string;
  severity: 'info' | 'warning' | 'error';
  count?: number;
  message: string;
  action: string;
  salonId?: string;
  salonName?: any;
}

interface Activity {
  type: string;
  message: string;
  timestamp: Date;
  relatedId: string;
}

export function OwnerDashboardOverview() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } = useQuery<DashboardOverview>({
    queryKey: ["/api/owner/dashboard/overview"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/dashboard/overview");
      return res.json();
    },
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  const { data: alerts = [] } = useQuery<DashboardAlert[]>({
    queryKey: ["/api/owner/dashboard/alerts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/dashboard/alerts");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activity = [] } = useQuery<Activity[]>({
    queryKey: ["/api/owner/dashboard/recent-activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/dashboard/recent-activity");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const handleAlertAction = (alert: DashboardAlert) => {
    switch (alert.action) {
      case 'GO_BOOKINGS':
        setSearchParams({ tab: 'bookings' });
        break;
      case 'GO_SERVICES':
        setSearchParams({ tab: 'services' });
        break;
      case 'GO_MASTERS':
        setSearchParams({ tab: 'masters' });
        break;
      case 'PUBLISH_SALON':
        setSearchParams({ tab: 'salons' });
        break;
      default:
        break;
    }
  };

  const getAlertVariant = (severity: string): 'default' | 'destructive' => {
    return severity === 'error' ? 'destructive' : 'default';
  };

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if no salons (empty state)
  const hasNoData = overview &&
    overview.today.revenue === 0 &&
    overview.today.bookings === 0 &&
    overview.month.bookings === 0 &&
    overview.month.topServices.length === 0 &&
    overview.month.topMasters.length === 0;

  if (hasNoData && alerts.some(a => a.type === 'no_services' || a.type === 'no_masters')) {
    return (
      <EmptyState
        icon={Store}
        title={t('dashboard.noSalonsYet', 'Welcome to Your Dashboard!')}
        description={t('dashboard.noSalonsDescription', 'Start by creating your first salon, then add services and masters to begin accepting bookings.')}
        action={{
          label: t('dashboard.createFirstSalon', 'Create First Salon'),
          onClick: () => setSearchParams({ tab: 'salons' }),
        }}
      />
    );
  }

  if (overviewError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('dashboard.errorTitle', 'Failed to Load')}</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{t('dashboard.loadError', 'Failed to load dashboard data. Please try again.')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => refetch()}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.severity)}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="mb-1">
                {alert.type === 'pending_bookings' && t('dashboard.alert.pendingBookings', 'Pending Bookings')}
                {alert.type === 'no_services' && t('dashboard.alert.noServices', 'No Services')}
                {alert.type === 'no_masters' && t('dashboard.alert.noMasters', 'No Masters')}
                {alert.type === 'salon_not_published' && t('dashboard.alert.notPublished', 'Salon Not Published')}
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4"
                  onClick={() => handleAlertAction(alert)}
                >
                  {alert.action === 'GO_BOOKINGS' && t('common.viewBookings', 'View Bookings')}
                  {alert.action === 'GO_SERVICES' && t('common.addServices', 'Add Services')}
                  {alert.action === 'GO_MASTERS' && t('common.addMasters', 'Add Masters')}
                  {alert.action === 'PUBLISH_SALON' && t('common.publish', 'Publish')}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Today's KPIs */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.today', 'Today')}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.revenue', 'Revenue')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.today.revenue)}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.today', 'Today')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.bookings', 'Bookings')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.today.bookings}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.today', 'Today')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.completionRate', 'Completion Rate')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.today.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.today', 'Today')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.newClients', 'New Clients')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.today.newClients}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.today', 'Today')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Week Trends */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.thisWeek', 'This Week')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('dashboard.weeklyRevenue', 'Weekly Revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{formatCurrency(overview.week.revenue)}</div>
              <div className="flex items-center text-sm">
                {overview.week.revenueChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={overview.week.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(overview.week.revenueChange)}
                </span>
                <span className="ml-1 text-muted-foreground">
                  {t('dashboard.vsLastWeek', 'vs last week')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('dashboard.weeklyBookings', 'Weekly Bookings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{overview.week.bookings}</div>
              <div className="flex items-center text-sm">
                {overview.week.bookingsChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={overview.week.bookingsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(overview.week.bookingsChange)}
                </span>
                <span className="ml-1 text-muted-foreground">
                  {t('dashboard.vsLastWeek', 'vs last week')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topServices', 'Top Services This Month')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.month.topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noData', 'No data yet')}
              </p>
            ) : (
              <div className="space-y-3">
                {overview.month.topServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {service.name?.[i18n.language as 'en' | 'ru' | 'uz'] || service.name?.en || 'Unknown'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {service.count} {t('dashboard.bookings', 'bookings')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Masters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topMasters', 'Top Masters This Month')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.month.topMasters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noData', 'No data yet')}
              </p>
            ) : (
              <div className="space-y-3">
                {overview.month.topMasters.map((master) => (
                  <div key={master.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{master.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(master.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity', 'Recent Activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noActivity', 'No recent activity')}
            </p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
