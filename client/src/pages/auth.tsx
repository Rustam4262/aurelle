import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Sparkles, User, Store, Check, Mail } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/language-switcher";

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm2.272 19.636h-2.182V9.454l-2.363 4.636H8.363l-2.363-4.636v10.182H3.818V4.363h2.182l3.636 7.273 3.636-7.273h2.182v15.273h-1.182z"/>
    </svg>
  );
}

function loginWithReplit() {
  window.location.href = "/api/login";
}

function loginWithYandex() {
  window.location.href = "/api/auth/yandex";
}

type AuthProviders = {
  replit: boolean;
  yandex: boolean;
};

type UserProfile = {
  exists: boolean;
  userId?: string;
  username?: string;
  role?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  isProfileComplete?: boolean;
};

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<"client" | "owner">("client");
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    city: "",
  });
  
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [emailAuthData, setEmailAuthData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const { data: providers } = useQuery<AuthProviders>({
    queryKey: ["/api/auth/providers"],
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { role: string; fullName: string; phone: string; city: string }) => {
      return apiRequest("POST", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("marketplace.auth.profileSaved"),
        description: t("marketplace.auth.welcomeMessage"),
      });
      if (selectedRole === "owner") {
        navigate("/owner");
      } else {
        navigate("/profile");
      }
    },
    onError: () => {
      toast({
        title: t("marketplace.auth.error"),
        description: t("marketplace.auth.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("marketplace.auth.loginSuccess"),
        description: t("marketplace.auth.welcomeBack"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("marketplace.auth.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("marketplace.auth.registerSuccess"),
        description: t("marketplace.auth.accountCreated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("marketplace.auth.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileMutation.mutate({
      role: selectedRole,
      fullName: formData.fullName,
      phone: formData.phone,
      city: formData.city,
    });
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "register") {
      if (emailAuthData.password !== emailAuthData.confirmPassword) {
        toast({
          title: t("marketplace.auth.error"),
          description: t("marketplace.auth.passwordMismatch"),
          variant: "destructive",
        });
        return;
      }
      registerMutation.mutate({
        email: emailAuthData.email,
        password: emailAuthData.password,
      });
    } else {
      loginMutation.mutate({
        email: emailAuthData.email,
        password: emailAuthData.password,
      });
    }
  };

  useEffect(() => {
    if (user && profile?.exists && profile?.isProfileComplete) {
      if (profile.role === "owner") {
        navigate("/owner");
      } else if (profile.role === "master") {
        navigate("/master");
      } else {
        navigate("/profile");
      }
    }
  }, [user, profile, navigate]);

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user && profile?.exists && profile?.isProfileComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  if (user && (!profile?.exists || !profile?.isProfileComplete)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-auth">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="font-serif text-2xl font-semibold">BeautyUz</span>
              </div>
              <h1 className="font-serif text-2xl text-foreground mb-2">
                {t("marketplace.auth.completeProfile")}
              </h1>
              <p className="text-muted-foreground">
                {t("marketplace.auth.completeProfileSubtitle")}
              </p>
            </div>

            {step === "role" ? (
              <div className="space-y-6">
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {t("marketplace.auth.selectRole")}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("client")}
                    className={`p-6 rounded-lg border-2 transition-all flex flex-col items-center gap-3 hover-elevate ${
                      selectedRole === "client"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    data-testid="button-role-client"
                  >
                    <User className={`h-10 w-10 ${selectedRole === "client" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium">{t("marketplace.auth.roleClient")}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {t("marketplace.auth.roleClientDesc")}
                    </span>
                    {selectedRole === "client" && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("owner")}
                    className={`p-6 rounded-lg border-2 transition-all flex flex-col items-center gap-3 hover-elevate ${
                      selectedRole === "owner"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    data-testid="button-role-owner"
                  >
                    <Store className={`h-10 w-10 ${selectedRole === "owner" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium">{t("marketplace.auth.roleOwner")}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {t("marketplace.auth.roleOwnerDesc")}
                    </span>
                    {selectedRole === "owner" && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setStep("details")}
                  data-testid="button-continue-role"
                >
                  {t("marketplace.auth.continue")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setStep("role")}
                    data-testid="button-back-step"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedRole === "client" ? t("marketplace.auth.roleClient") : t("marketplace.auth.roleOwner")}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("marketplace.auth.fullName")}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t("marketplace.auth.fullNamePlaceholder")}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      data-testid="input-fullname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("marketplace.auth.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">{t("marketplace.auth.city")}</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder={t("marketplace.auth.cityPlaceholder")}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      data-testid="input-city"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={saveProfileMutation.isPending}
                  data-testid="button-complete-registration"
                >
                  {saveProfileMutation.isPending 
                    ? t("marketplace.auth.saving") 
                    : t("marketplace.auth.completeRegistration")}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-auth">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="font-serif text-2xl font-semibold">BeautyUz</span>
            </div>
            <h1 className="font-serif text-2xl text-foreground mb-2">
              {t("marketplace.auth.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("marketplace.auth.subtitle")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{t("marketplace.auth.forClients")}</p>
                <p className="text-xs text-muted-foreground">{t("marketplace.auth.forClientsDesc")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{t("marketplace.auth.forOwners")}</p>
                <p className="text-xs text-muted-foreground">{t("marketplace.auth.forOwnersDesc")}</p>
              </div>
            </div>

            <Tabs defaultValue="social" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="social" data-testid="tab-social-login">
                  {t("marketplace.auth.socialLogin")}
                </TabsTrigger>
                <TabsTrigger value="email" data-testid="tab-email-login">
                  {t("marketplace.auth.emailLogin")}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="social" className="space-y-3 mt-4">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={loginWithReplit}
                  data-testid="button-login-google"
                >
                  <SiGoogle className="mr-2 h-5 w-5 text-[#4285F4]" />
                  {t("marketplace.auth.signInWithGoogle")}
                </Button>

                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={loginWithReplit}
                  data-testid="button-login-apple"
                >
                  <SiApple className="mr-2 h-5 w-5" />
                  {t("marketplace.auth.signInWithApple")}
                </Button>

                {providers?.yandex && (
                  <Button
                    className="w-full"
                    size="lg"
                    variant="outline"
                    onClick={loginWithYandex}
                    data-testid="button-login-yandex"
                  >
                    <YandexIcon className="mr-2 h-5 w-5 text-[#FF0000]" />
                    {t("marketplace.auth.signInWithYandex")}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="email" className="mt-4">
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant={authMode === "login" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setAuthMode("login")}
                      data-testid="button-mode-login"
                    >
                      {t("marketplace.auth.login")}
                    </Button>
                    <Button
                      type="button"
                      variant={authMode === "register" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setAuthMode("register")}
                      data-testid="button-mode-register"
                    >
                      {t("marketplace.auth.register")}
                    </Button>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("marketplace.auth.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={emailAuthData.email}
                        onChange={(e) => setEmailAuthData({ ...emailAuthData, email: e.target.value })}
                        required
                        data-testid="input-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t("marketplace.auth.password")}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={emailAuthData.password}
                        onChange={(e) => setEmailAuthData({ ...emailAuthData, password: e.target.value })}
                        required
                        minLength={6}
                        data-testid="input-password"
                      />
                    </div>

                    {authMode === "register" && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("marketplace.auth.confirmPassword")}</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="********"
                          value={emailAuthData.confirmPassword}
                          onChange={(e) => setEmailAuthData({ ...emailAuthData, confirmPassword: e.target.value })}
                          required
                          minLength={6}
                          data-testid="input-confirm-password"
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={loginMutation.isPending || registerMutation.isPending}
                      data-testid="button-submit-email-auth"
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      {loginMutation.isPending || registerMutation.isPending
                        ? t("marketplace.auth.processing")
                        : authMode === "login"
                        ? t("marketplace.auth.signIn")
                        : t("marketplace.auth.createAccount")}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-center text-xs text-muted-foreground">
              {t("marketplace.auth.termsNotice")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
