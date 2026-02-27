import { lazy, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipToContent } from "@/components/skip-to-content";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Loader2 } from "lucide-react";

// Eager load Home page (first page users see)
import Home from "@/pages/home";

// Lazy load all other pages for code splitting
const NotFound = lazy(() => import("@/pages/not-found"));
const SalonPage = lazy(() => import("@/pages/salon"));
const SearchPage = lazy(() => import("@/pages/search"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
// ProfilePage removed - /profile now redirects to /client
const OwnerPage = lazy(() => import("@/pages/owner"));
const OwnerSalonPage = lazy(() => import("@/pages/owner-salon"));
const MasterPage = lazy(() => import("@/pages/master"));
const ClientPage = lazy(() => import("@/pages/client"));
const AboutPage = lazy(() => import("@/pages/about"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const AdminPage = lazy(() => import("@/pages/admin"));
const SoloMasterPage = lazy(() => import("@/pages/solo-master"));
const SoloMasterOnboardingPage = lazy(() => import("@/pages/solo-master-onboarding"));
const PublicMasterPage = lazy(() => import("@/pages/public-master"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Router component with ErrorBoundary that resets on navigation
function Router() {
  const [location] = useLocation();

  return (
    <ErrorBoundary key={location}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={AboutPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/salon/:id" component={SalonPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
          <Route path="/auth/reset-password" component={ResetPasswordPage} />
          <Route path="/profile">
            <Redirect to="/client" />
          </Route>
          <Route path="/owner">
            <ProtectedRoute><OwnerPage /></ProtectedRoute>
          </Route>
          <Route path="/owner/salon/:id">
            <ProtectedRoute><OwnerSalonPage /></ProtectedRoute>
          </Route>
          <Route path="/master">
            <ProtectedRoute><MasterPage /></ProtectedRoute>
          </Route>
          <Route path="/client">
            <ProtectedRoute><ClientPage /></ProtectedRoute>
          </Route>
          <Route path="/solo-master">
            <ProtectedRoute><SoloMasterPage /></ProtectedRoute>
          </Route>
          <Route path="/solo-master/onboarding">
            <ProtectedRoute><SoloMasterOnboardingPage /></ProtectedRoute>
          </Route>
          <Route path="/admin">
            <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
          </Route>
          <Route path="/admin/:rest*">
            <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
          </Route>
          <Route path="/master/:slug" component={PublicMasterPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="system" storageKey="aurelle-ui-theme">
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <SkipToContent />
              <Toaster />
              <PWAInstallPrompt />
              <Router />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </I18nextProvider>
  );
}

export default App;
