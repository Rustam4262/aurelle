import { RoleSelectionGate } from "@/components/role-selection-gate";
import { MessengerNotifications } from "@/components/messenger-notifications";
import { AudienceProvider } from "@/components/audience-provider";
import { lazy, Suspense } from "react";
import { Switch, Route, useLocation, useSearch, Redirect, Router as WouterRouter } from "wouter";
import { useLocalizedLocation } from "@/lib/localized-location";
import {
  PublicMetadata,
  PublicLandingPage,
  InitialPublicContent,
} from "@/components/public-document";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { documentPolicy } from "@shared/seo-policy";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipToContent } from "@/components/skip-to-content";
import { ErrorBoundary } from "@/components/error-boundary";
import { UpgradeModal } from "@/components/upgrade-modal";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

// Lazy load route pages so non-home screens do not pull the full landing page bundle.
const Home = lazy(() => import("@/pages/home"));
const NotFound = lazy(() => import("@/pages/not-found"));
const SalonPage = lazy(() => import("@/pages/salon"));
const SearchPage = lazy(() => import("@/pages/search"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AcceptInvitationPage = lazy(() => import("@/pages/accept-invitation"));
// ProfilePage removed - /profile now redirects to /client
const OwnerPage = lazy(() => import("@/pages/owner"));
const OwnerSalonPage = lazy(() => import("@/pages/owner-salon"));
const MasterPage = lazy(() => import("@/pages/master"));
const ClientPage = lazy(() => import("@/pages/client"));
const MessengerPage = lazy(() => import("@/pages/messenger"));
const AboutPage = lazy(() => import("@/pages/about"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const AdminPage = lazy(() => import("@/pages/admin"));
const SoloMasterPage = lazy(() => import("@/pages/solo-master"));
const ChooseRolePage = lazy(() => import("@/pages/choose-role"));
const SoloMasterOnboardingPage = lazy(() => import("@/pages/solo-master-onboarding"));
const PublicMasterPage = lazy(() => import("@/pages/public-master"));
const PricingPage = lazy(() => import("@/pages/pricing"));

// Loading fallback component
function PageLoader() {
  return <InitialPublicContent />;
}

// Router component with ErrorBoundary that resets on navigation
function Router() {
  const [location] = useLocation();
  const search = useSearch();
  const policy = documentPolicy(`${window.location.pathname}${search ? `?${search}` : ""}`);

  return (
    <ErrorBoundary key={location}>
      <Helmet>
        <meta name="robots" content={policy.noIndex ? "noindex, follow" : "index, follow"} />
      </Helmet>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={AboutPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/salons" component={SearchPage} />
          <Route path="/salon/:id" component={SalonPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/choose-role" component={ChooseRolePage} />
          <Route path="/login">
            <Redirect to="/auth" />
          </Route>
          <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
          <Route path="/auth/reset-password" component={ResetPasswordPage} />
          <Route path="/accept-invitation" component={AcceptInvitationPage} />
          <Route path="/profile">
            <Redirect to="/client" />
          </Route>
          <Route path="/owner" component={OwnerPage} />
          <Route path="/owner/salon/:id" component={OwnerSalonPage} />
          <Route path="/master" component={MasterPage} />
          <Route path="/client" component={ClientPage} />
          <Route path="/messenger" component={MessengerPage} />
          <Route path="/solo-master" component={SoloMasterPage} />
          <Route path="/solo-master/onboarding" component={SoloMasterOnboardingPage} />
          <Route path="/admin/users/:id" component={AdminPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/:rest*" component={AdminPage} />
          <Route path="/master/:slug" component={PublicMasterPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/:city/:category" component={PublicLandingPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <PublicMetadata />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="system" storageKey="aurelle-ui-theme">
          <QueryClientProvider client={queryClient}>
            <AudienceProvider>
              <TooltipProvider>
                <SkipToContent />
                <Toaster />
                <UpgradeModal />
                <CookieConsentBanner />
                <WouterRouter hook={useLocalizedLocation}>
                  <RoleSelectionGate>
                    <Router />
                  </RoleSelectionGate>
                  <MessengerNotifications />
                </WouterRouter>
              </TooltipProvider>
            </AudienceProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </I18nextProvider>
  );
}

export default App;
