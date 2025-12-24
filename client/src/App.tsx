import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SalonPage from "@/pages/salon";
import AuthPage from "@/pages/auth";
import ProfilePage from "@/pages/profile";
import OwnerPage from "@/pages/owner";
import OwnerSalonPage from "@/pages/owner-salon";
import MasterPage from "@/pages/master";
import ClientPage from "@/pages/client";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/salon/:id" component={SalonPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/owner" component={OwnerPage} />
      <Route path="/owner/salon/:id" component={OwnerSalonPage} />
      <Route path="/master" component={MasterPage} />
      <Route path="/client" component={ClientPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
