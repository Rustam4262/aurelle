import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  LockKeyhole,
  Mail,
  Star,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";

type AuthUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin?: boolean;
  role?: string | null;
};

type ProvidersStatus = {
  local: boolean;
  google: boolean;
  yandex: boolean;
  github?: boolean;
  phone?: boolean;
};

type Locale = "ru" | "en" | "uz";
type RegistrationRole = "client" | "solo_master" | "owner";

type RoleMeta = {
  value: RegistrationRole;
  title: string;
  description: string;
  note: string;
  Icon: typeof UserRound;
};

type Copy = {
  heroBadge: string;
  headline: string;
  subtitle: string;
  trustTitle: string;
  trustDescription: string;
  trustStats: Array<{ value: string; label: string }>;
  benefits: string[];
  experienceCards: Array<{ title: string; description: string }>;
  secureBadge: string;
  formTitle: string;
  formSubtitle: string;
  socialTitle: string;
  socialRegisterHint: string;
  temporaryTitle: string;
  temporaryDescription: string;
  loginTab: string;
  registerTab: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  forgotPassword: string;
  rememberMe: string;
  loginButton: string;
  registerButton: string;
  roleLabel: string;
  roleHint: string;
  roleRequired: string;
  selectedRoleLabel: string;
  termsLabel: string;
  termsLink: string;
  privacyLink: string;
  termsRequired: string;
  mismatch: string;
  shortPassword: string;
  invalidEmail: string;
  loginError: string;
  registerError: string;
  checkingSession: string;
  googleButton: string;
  yandexButton: string;
  providerUnavailable: string;
  completeRoleBeforeSocial: string;
  loginFastTrack: string;
  showPassword: string;
  hidePassword: string;
  backToHome: string;
};

function Logo({ className }: { className?: string }) {
  return <img src="/images/logo.jpg" alt="AURELLE" className={className} />;
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm2.272 19.636h-2.182V9.454l-2.363 4.636H8.363l-2.363-4.636v10.182H3.818V4.363h2.182l3.636 7.273 3.636-7.273h2.182v15.273h-1.182z" />
    </svg>
  );
}

async function submitJson(event: React.FormEvent<HTMLFormElement>, url: string) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { errors?: Array<{ message?: string }>; message?: string; error?: string })
        .errors?.[0]?.message ||
      (payload as { message?: string; error?: string }).message ||
      (payload as { error?: string }).error ||
      "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Failed to load current user");
  return response.json();
}

async function fetchProvidersStatus(): Promise<ProvidersStatus> {
  const response = await fetch("/api/auth/providers", { credentials: "include" });
  if (!response.ok) {
    return { local: true, google: true, yandex: true };
  }
  return response.json();
}

async function resolvePostLoginPath(): Promise<string> {
  const savedRedirect = sessionStorage.getItem("redirectAfterLogin");
  if (savedRedirect) {
    sessionStorage.removeItem("redirectAfterLogin");
    return savedRedirect;
  }

  const user = await fetchCurrentUser();
  if (!user) return "/auth";
  if (user.isAdmin || user.role === "admin") return "/admin";
  if (user.role === "owner") return "/owner";
  if (user.role === "solo_master" || user.role === "master") return "/solo-master";
  return "/client";
}

const authCopy: Record<Locale, Copy> = {
  ru: {
    heroBadge: "AURELLE beauty tech access",
    headline: "Запись, управление и рост в одном пространстве",
    subtitle:
      "Единый вход для клиентов, фриланс-мастеров и владельцев салонов. Бронируйте услуги, ведите расписание и управляйте бизнесом без лишних экранов.",
    trustTitle: "Премиальный доступ к платформе AURELLE",
    trustDescription:
      "Безопасный вход, быстрый старт и аккуратный путь в тот кабинет, который нужен именно вам.",
    trustStats: [
      { value: "24/7", label: "доступ к кабинету" },
      { value: "3 роли", label: "ясный сценарий старта" },
      { value: "1 вход", label: "единая экосистема" },
    ],
    benefits: [
      "Быстрая запись без звонков и переписок",
      "Избранное и история визитов в одном месте",
      "Расписание мастера и услуги без лишней рутины",
      "Управление салоном, командой и бронированиями",
    ],
    experienceCards: [
      {
        title: "Для клиентов",
        description: "Любимые салоны, бронирования и история посещений всегда под рукой.",
      },
      {
        title: "Для мастеров",
        description: "Личный кабинет, расписание, услуги и контроль загрузки дня.",
      },
      {
        title: "Для владельцев",
        description: "Команда, услуги, календарь и рост салона в одном кабинете.",
      },
    ],
    secureBadge: "Безопасный вход",
    formTitle: "Вход и регистрация",
    formSubtitle:
      "Выберите быстрый путь: вернуться в кабинет или создать новый аккаунт под свою роль.",
    socialTitle: "Продолжить через соцсеть",
    socialRegisterHint:
      "Для регистрации через соцсеть сначала выберите роль, чтобы мы подготовили правильный кабинет.",
    temporaryTitle: "Телефон временно недоступен",
    temporaryDescription: "SMS-авторизацию вернём позже. Сейчас доступны email, Google и Яндекс.",
    loginTab: "Вход",
    registerTab: "Регистрация",
    emailLabel: "Email",
    passwordLabel: "Пароль",
    confirmPasswordLabel: "Подтвердите пароль",
    forgotPassword: "Забыли пароль?",
    rememberMe: "Запомнить меня",
    loginButton: "Войти в кабинет",
    registerButton: "Создать аккаунт",
    roleLabel: "Кто вы?",
    roleHint: "От выбора роли зависит кабинет после входа и onboarding.",
    roleRequired: "Выберите роль, чтобы продолжить регистрацию.",
    selectedRoleLabel: "После регистрации вы получите:",
    termsLabel: "Я принимаю",
    termsLink: "условия сервиса",
    privacyLink: "политику конфиденциальности",
    termsRequired: "Подтвердите согласие с условиями и политикой конфиденциальности.",
    mismatch: "Пароли не совпадают.",
    shortPassword: "Пароль должен содержать минимум 8 символов.",
    invalidEmail: "Введите корректный email.",
    loginError: "Не удалось войти. Проверьте данные и попробуйте снова.",
    registerError: "Не удалось создать аккаунт. Попробуйте ещё раз.",
    checkingSession: "Проверяем сессию и открываем ваш кабинет...",
    googleButton: "Продолжить с Google",
    yandexButton: "Продолжить с Яндекс",
    providerUnavailable: "Временно недоступно",
    completeRoleBeforeSocial: "Сначала выберите роль для регистрации через соцсеть.",
    loginFastTrack: "Быстрый путь для тех, кто уже с нами",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    backToHome: "На главную",
  },
  en: {
    heroBadge: "AURELLE beauty tech access",
    headline: "Bookings, management, and growth in one space",
    subtitle:
      "One elegant entry point for clients, solo masters, and salon owners. Book services, manage schedules, and run your beauty business without clutter.",
    trustTitle: "Premium access to the AURELLE platform",
    trustDescription:
      "Secure sign-in, a fast start, and a clear path to the workspace that fits your role.",
    trustStats: [
      { value: "24/7", label: "workspace access" },
      { value: "3 roles", label: "clear start paths" },
      { value: "1 login", label: "single ecosystem" },
    ],
    benefits: [
      "Instant booking without calls",
      "Favorites and visit history in one place",
      "Master schedule and services without extra friction",
      "Salon, team, and booking management in one dashboard",
    ],
    experienceCards: [
      {
        title: "For clients",
        description: "Favorite salons, bookings, and visit history always within reach.",
      },
      {
        title: "For masters",
        description: "A personal workspace with schedule, services, and workload control.",
      },
      {
        title: "For owners",
        description: "Team, services, calendar, and salon growth in a single space.",
      },
    ],
    secureBadge: "Secure access",
    formTitle: "Sign in and registration",
    formSubtitle:
      "Choose the fastest path: return to your workspace or create a new account for your role.",
    socialTitle: "Continue with social login",
    socialRegisterHint:
      "For social registration, choose your role first so we can prepare the right workspace.",
    temporaryTitle: "Phone sign-in is unavailable",
    temporaryDescription:
      "SMS authorization will return later. Email, Google, and Yandex are available now.",
    loginTab: "Sign in",
    registerTab: "Register",
    emailLabel: "Email",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    forgotPassword: "Forgot password?",
    rememberMe: "Remember me",
    loginButton: "Enter workspace",
    registerButton: "Create account",
    roleLabel: "Who are you?",
    roleHint: "Your role defines the workspace and onboarding after sign-up.",
    roleRequired: "Choose a role to continue registration.",
    selectedRoleLabel: "After registration you will get:",
    termsLabel: "I accept the",
    termsLink: "terms of service",
    privacyLink: "privacy policy",
    termsRequired: "Please accept the terms and privacy policy.",
    mismatch: "Passwords do not match.",
    shortPassword: "Password must be at least 8 characters.",
    invalidEmail: "Enter a valid email address.",
    loginError: "Unable to sign in. Check your details and try again.",
    registerError: "Unable to create an account. Please try again.",
    checkingSession: "Checking session and opening your dashboard...",
    googleButton: "Continue with Google",
    yandexButton: "Continue with Yandex",
    providerUnavailable: "Temporarily unavailable",
    completeRoleBeforeSocial: "Choose a role before registering with a social provider.",
    loginFastTrack: "Fast path for returning users",
    showPassword: "Show password",
    hidePassword: "Hide password",
    backToHome: "Back to home",
  },
  uz: {
    heroBadge: "AURELLE beauty tech access",
    headline: "Yozuv, boshqaruv va o'sish bitta makonda",
    subtitle:
      "Mijozlar, frilans ustalar va salon egalari uchun yagona kirish nuqtasi. Xizmatlarni bron qiling, jadvalni boshqaring va beauty biznesingizni ortiqcha murakkabliksiz yuriting.",
    trustTitle: "AURELLE platformasiga premium kirish",
    trustDescription: "Xavfsiz kirish, tez start va aynan sizga kerak bo'lgan kabinetga aniq yo'l.",
    trustStats: [
      { value: "24/7", label: "kabinetga kirish" },
      { value: "3 rol", label: "aniq start ssenariylari" },
      { value: "1 kirish", label: "yagona ekotizim" },
    ],
    benefits: [
      "Qo'ng'iroqsiz tez bron qilish",
      "Sevimlilar va tashriflar tarixi bitta joyda",
      "Usta jadvali va xizmatlari ortiqcha ishlarсыз",
      "Salon, jamoa va bronlarni bitta kabinetda boshqarish",
    ],
    experienceCards: [
      {
        title: "Mijozlar uchun",
        description: "Sevimli salonlar, bronlar va tashriflar tarixi doim qo'l ostida.",
      },
      {
        title: "Ustalar uchun",
        description: "Shaxsiy kabinet, jadval, xizmatlar va kun yuklamasi nazorati.",
      },
      {
        title: "Egalari uchun",
        description: "Jamoa, xizmatlar, kalendar va salon o'sishi bitta makonda.",
      },
    ],
    secureBadge: "Xavfsiz kirish",
    formTitle: "Kirish va ro'yxatdan o'tish",
    formSubtitle:
      "Eng qulay yo'lni tanlang: kabinetga qaytish yoki o'z rolingiz uchun yangi akkaunt yaratish.",
    socialTitle: "Ijtimoiy tarmoq orqali davom eting",
    socialRegisterHint:
      "Ijtimoiy tarmoq orqali ro'yxatdan o'tishdan oldin rolni tanlang, shunda to'g'ri kabinet tayyorlanadi.",
    temporaryTitle: "Telefon orqali kirish vaqtincha yopiq",
    temporaryDescription:
      "SMS avtorizatsiya keyinroq qaytadi. Hozir email, Google va Yandex mavjud.",
    loginTab: "Kirish",
    registerTab: "Ro'yxatdan o'tish",
    emailLabel: "Email",
    passwordLabel: "Parol",
    confirmPasswordLabel: "Parolni tasdiqlang",
    forgotPassword: "Parolni unutdingizmi?",
    rememberMe: "Meni eslab qol",
    loginButton: "Kabinetga kirish",
    registerButton: "Akkaunt yaratish",
    roleLabel: "Siz kimsiz?",
    roleHint: "Rol tanlovi kabinet va onboarding jarayonini belgilaydi.",
    roleRequired: "Ro'yxatdan o'tishni davom ettirish uchun rolni tanlang.",
    selectedRoleLabel: "Ro'yxatdan o'tgandan keyin sizda bo'ladi:",
    termsLabel: "Men",
    termsLink: "xizmat shartlari",
    privacyLink: "maxfiylik siyosati",
    termsRequired: "Shartlar va maxfiylik siyosatini tasdiqlang.",
    mismatch: "Parollar mos kelmaydi.",
    shortPassword: "Parol kamida 8 ta belgidan iborat bo'lishi kerak.",
    invalidEmail: "To'g'ri email kiriting.",
    loginError: "Kirish amalga oshmadi. Ma'lumotlarni tekshirib, qayta urinib ko'ring.",
    registerError: "Akkaunt yaratib bo'lmadi. Yana bir bor urinib ko'ring.",
    checkingSession: "Sessiya tekshirilmoqda va kabinetingiz ochilmoqda...",
    googleButton: "Google bilan davom etish",
    yandexButton: "Yandex bilan davom etish",
    providerUnavailable: "Vaqtincha mavjud emas",
    completeRoleBeforeSocial: "Ijtimoiy tarmoq orqali ro'yxatdan o'tishdan oldin rolni tanlang.",
    loginFastTrack: "Qaytib kelgan foydalanuvchilar uchun tez yo'l",
    showPassword: "Parolni ko'rsatish",
    hidePassword: "Parolni yashirish",
    backToHome: "Bosh sahifaga",
  },
};

const localeFromLanguage = (language: string): Locale => {
  if (language.startsWith("en")) return "en";
  if (language.startsWith("uz")) return "uz";
  return "ru";
};

export default function AuthPage() {
  const { toast } = useToast();
  const { i18n: i18nInstance } = useTranslation();
  const currentLocale = localeFromLanguage(
    i18nInstance.resolvedLanguage || i18nInstance.language || "ru",
  );
  const copy = authCopy[currentLocale];

  const [isResolvingSession, setIsResolvingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registrationRole, setRegistrationRole] = useState<RegistrationRole | "">("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [providers, setProviders] = useState<ProvidersStatus>({
    local: true,
    google: true,
    yandex: true,
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const roles: RoleMeta[] = useMemo(
    () => [
      {
        value: "client",
        title: currentLocale === "en" ? "Client" : currentLocale === "uz" ? "Mijoz" : "Клиент",
        description:
          currentLocale === "en"
            ? "Bookings, favorites, reviews, and visit history."
            : currentLocale === "uz"
              ? "Bronlar, sevimlilar, sharhlar va tashriflar tarixi."
              : "Записи, избранное, отзывы и история посещений.",
        note:
          currentLocale === "en"
            ? "A personal area for fast bookings, favorites, and returning to the best places."
            : currentLocale === "uz"
              ? "Tez bron, sevimlilar va eng yaxshi joylarga qaytish uchun shaxsiy kabinet."
              : "Личный кабинет для быстрых записей, избранного и возвращения в любимые места.",
        Icon: Heart,
      },
      {
        value: "solo_master",
        title:
          currentLocale === "en"
            ? "Freelance master"
            : currentLocale === "uz"
              ? "Frilans usta"
              : "Фриланс-мастер",
        description:
          currentLocale === "en"
            ? "Personal schedule, services, and workload without a salon."
            : currentLocale === "uz"
              ? "Salonsiz shaxsiy jadval, xizmatlar va yuklama nazorati."
              : "Личный кабинет мастера, расписание и услуги без салона.",
        note:
          currentLocale === "en"
            ? "A dedicated workspace for schedule, services, and steady client flow."
            : currentLocale === "uz"
              ? "Jadval, xizmatlar va barqaror mijoz oqimi uchun alohida makon."
              : "Отдельный кабинет для расписания, услуг и понятной загрузки без лишних шагов.",
        Icon: WandSparkles,
      },
      {
        value: "owner",
        title:
          currentLocale === "en"
            ? "Salon owner"
            : currentLocale === "uz"
              ? "Salon egasi"
              : "Владелец салона",
        description:
          currentLocale === "en"
            ? "Team, services, bookings, and business control in one place."
            : currentLocale === "uz"
              ? "Jamoa, xizmatlar, bronlar va biznes nazorati bitta joyda."
              : "Команда, услуги, бронирования и контроль салона в одном кабинете.",
        note:
          currentLocale === "en"
            ? "An operating space for team coordination, calendar control, and salon growth."
            : currentLocale === "uz"
              ? "Jamoa koordinatsiyasi, kalendar nazorati va salon o'sishi uchun makon."
              : "Операционный кабинет для команды, календаря, услуг и роста салона.",
        Icon: Building2,
      },
    ],
    [currentLocale],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [user, providerState] = await Promise.all([
          fetchCurrentUser(),
          fetchProvidersStatus().catch(() => ({ local: true, google: true, yandex: true })),
        ]);
        if (!cancelled) setProviders(providerState);
        if (!user || cancelled) {
          if (!cancelled) setIsResolvingSession(false);
          return;
        }
        const nextPath = await resolvePostLoginPath();
        if (!cancelled) window.location.replace(nextPath);
      } catch {
        if (!cancelled) setIsResolvingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());
  const loginFormValid = isValidEmail(loginEmail) && loginPassword.length >= 8;
  const registerFormValid =
    isValidEmail(registerEmail) &&
    registerPassword.length >= 8 &&
    registerConfirmPassword.length >= 8 &&
    registerPassword === registerConfirmPassword &&
    !!registrationRole &&
    agreeToTerms;

  const loginWithProvider = (provider: "google" | "yandex") => {
    if (!providers[provider]) {
      toast({
        title: copy.providerUnavailable,
        description: provider === "google" ? copy.googleButton : copy.yandexButton,
        variant: "destructive",
      });
      return;
    }
    if (activeTab === "register" && !registrationRole) {
      setRegisterError(copy.completeRoleBeforeSocial);
      toast({
        title: copy.roleRequired,
        description: copy.completeRoleBeforeSocial,
        variant: "destructive",
      });
      return;
    }
    const role = activeTab === "register" ? registrationRole : undefined;
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    // Same sessionStorage key the email login/register flow already reads via
    // resolvePostLoginPath — OAuth previously never sent this, so it always
    // dropped a guest back to /auth instead of the page they came from.
    let redirect: string | null = null;
    try {
      redirect = sessionStorage.getItem("redirectAfterLogin");
    } catch {
      // sessionStorage unavailable — fall back to the default post-login route.
    }
    if (redirect) params.set("redirect", redirect);
    const q = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `/api/auth/${provider}${q}`;
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    if (!isValidEmail(loginEmail)) {
      setLoginError(copy.invalidEmail);
      return;
    }
    if (loginPassword.length < 8) {
      setLoginError(copy.shortPassword);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitJson(event, "/api/auth/login");
      const nextPath = await resolvePostLoginPath();
      window.location.replace(nextPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.loginError;
      setLoginError(message);
      toast({ title: copy.loginError, description: message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleEmailRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError("");
    if (!registrationRole) {
      setRegisterError(copy.roleRequired);
      return;
    }
    if (!isValidEmail(registerEmail)) {
      setRegisterError(copy.invalidEmail);
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError(copy.shortPassword);
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(copy.mismatch);
      return;
    }
    if (!agreeToTerms) {
      setRegisterError(copy.termsRequired);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitJson(event, "/api/auth/register");
      const nextPath = await resolvePostLoginPath();
      window.location.replace(nextPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.registerError;
      setRegisterError(message);
      toast({ title: copy.registerError, description: message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (isResolvingSession) {
    return (
      <div className="audience-client-surface flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(227,54,116,0.12),transparent_26%),linear-gradient(180deg,#dacdd1_0%,#d7c7cd_52%,#dacdd1_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(200,29,96,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_22%),linear-gradient(180deg,#07070a_0%,#121216_45%,#09090b_100%)] dark:text-white">
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/90 px-5 py-3 text-sm text-muted-foreground shadow-lg shadow-primary/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.checkingSession}
        </div>
      </div>
    );
  }

  return (
    <div className="audience-client-surface min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(227,54,116,0.11),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.08),transparent_20%),linear-gradient(180deg,#dacdd1_0%,#d7c7cd_48%,#dacdd1_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(227,54,116,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_18%),linear-gradient(180deg,#08080b_0%,#111117_46%,#09090b_100%)] dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-start justify-between gap-3 py-2 sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="border border-border bg-card/85 text-foreground shadow-sm hover:bg-accent hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label={copy.backToHome}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/" className="hidden items-center gap-3 sm:flex">
              <div className="rounded-2xl border border-primary/10 bg-card/90 p-2 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Logo className="h-10 w-10 rounded-xl object-cover" />
              </div>
              <div>
                <div className="font-serif text-xl font-semibold tracking-wide text-foreground dark:text-white">
                  AURELLE
                </div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground dark:text-white/45">
                  beauty marketplace
                </div>
              </div>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher
              variant="outline"
              className="border-border bg-card/85 text-foreground hover:bg-accent dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            />
          </div>
        </header>

        <main className="flex flex-1 items-center py-6 lg:py-10">
          <div className="mx-auto w-full max-w-xl">
            <section className="order-1 min-w-0 rounded-[28px] border border-white/55 bg-card/88 p-4 shadow-[0_32px_90px_rgba(227,54,116,0.12)] backdrop-blur-2xl [overflow-wrap:anywhere] dark:border-white/10 dark:bg-[#141418]/96 dark:shadow-black/35 sm:rounded-[32px] sm:p-7 lg:order-2 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-foreground/80 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                  <LockKeyhole className="mr-2 h-3.5 w-3.5" />
                  {copy.secureBadge}
                </Badge>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-white/55 dark:hover:text-white"
                >
                  AURELLE
                </Link>
              </div>

              <div className="mt-5">
                <h2 className="font-serif text-3xl text-slate-950 dark:text-white">
                  {copy.formTitle}
                </h2>
                <p className="mt-2 max-w-xl break-words text-sm leading-7 text-muted-foreground dark:text-white/62">
                  {copy.formSubtitle}
                </p>
              </div>

              <Alert className="mt-5 border-primary/15 bg-primary/[0.045] text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                <AlertTitle className="text-foreground dark:text-white">
                  {copy.temporaryTitle}
                </AlertTitle>
                <AlertDescription className="break-words text-muted-foreground dark:text-white/65">
                  {copy.temporaryDescription}
                </AlertDescription>
              </Alert>

              <div className="mt-6 rounded-[26px] border border-border/70 bg-muted/25 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3 sm:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-950 dark:text-white">
                      {copy.socialTitle}
                    </div>
                    {activeTab === "register" && (
                      <div className="mt-1 break-words text-xs leading-5 text-muted-foreground dark:text-white/55">
                        {copy.socialRegisterHint}
                      </div>
                    )}
                  </div>
                  <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:flex dark:bg-white/10 dark:text-white">
                    <Star className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-auto min-h-12 items-start justify-start rounded-2xl border-border bg-card px-4 py-3 text-slate-950 hover:bg-accent dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.06] sm:items-center"
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => loginWithProvider("google")}
                    disabled={
                      isSubmitting ||
                      !providers.google ||
                      (activeTab === "register" && !registrationRole)
                    }
                  >
                    <SiGoogle className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-[#4285F4] sm:mt-0" />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block break-words text-sm leading-5">
                        {copy.googleButton}
                      </span>
                      {!providers.google && (
                        <span className="mt-1 block text-[11px] text-muted-foreground dark:text-white/45">
                          {copy.providerUnavailable}
                        </span>
                      )}
                    </span>
                  </Button>
                  <Button
                    className="h-auto min-h-12 items-start justify-start rounded-2xl border-border bg-card px-4 py-3 text-slate-950 hover:bg-accent dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.06] sm:items-center"
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => loginWithProvider("yandex")}
                    disabled={
                      isSubmitting ||
                      !providers.yandex ||
                      (activeTab === "register" && !registrationRole)
                    }
                  >
                    <YandexIcon className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-[#FF0000] sm:mt-0" />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block break-words text-sm leading-5">
                        {copy.yandexButton}
                      </span>
                      {!providers.yandex && (
                        <span className="mt-1 block text-[11px] text-muted-foreground dark:text-white/45">
                          {copy.providerUnavailable}
                        </span>
                      )}
                    </span>
                  </Button>
                </div>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "login" | "register")}
                className="mt-7 w-full"
              >
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-muted p-1 dark:bg-white/[0.05]">
                  <TabsTrigger value="login" className="min-w-0 rounded-xl px-2 text-sm">
                    {copy.loginTab}
                  </TabsTrigger>
                  <TabsTrigger value="register" className="min-w-0 rounded-xl px-2 text-sm">
                    {copy.registerTab}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleEmailLogin} className="space-y-5" noValidate>
                    <div className="space-y-2">
                      <Label
                        htmlFor="login-email"
                        className="text-foreground/85 dark:text-white/85"
                      >
                        {copy.emailLabel}
                      </Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        autoComplete="email"
                        className="h-12 rounded-2xl border-border bg-card text-slate-950 placeholder:text-slate-400 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-white/28"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="login-password"
                        className="text-foreground/85 dark:text-white/85"
                      >
                        {copy.passwordLabel}
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          name="password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="********"
                          required
                          minLength={8}
                          autoComplete="current-password"
                          className="h-12 rounded-2xl border-border bg-card pr-12 text-slate-950 placeholder:text-slate-400 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-white/28"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-white/45 dark:hover:text-white"
                          aria-label={showLoginPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex min-w-0 items-center gap-2 text-muted-foreground dark:text-white/65">
                        <Checkbox
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                          name="rememberMe"
                        />
                        <span>{copy.rememberMe}</span>
                      </label>
                      <Link href="/auth/forgot-password" className="text-primary hover:opacity-80">
                        {copy.forgotPassword}
                      </Link>
                    </div>

                    {loginError && (
                      <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-2xl bg-[#e33674] text-white shadow-lg shadow-[#e33674]/25 hover:bg-[#f04a84]"
                      size="lg"
                      disabled={!loginFormValid || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-5 w-5" />
                      )}
                      {copy.loginButton}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleEmailRegister} className="space-y-5" noValidate>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-foreground/85 dark:text-white/85">
                          {copy.roleLabel}
                        </Label>
                        <p className="text-xs leading-5 text-muted-foreground dark:text-white/55">
                          {copy.roleHint}
                        </p>
                      </div>
                      <input type="hidden" name="role" value={registrationRole} />
                      <div className="grid gap-3">
                        {roles.map((role) => {
                          const selected = registrationRole === role.value;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                setRegistrationRole(role.value);
                                setRegisterError("");
                              }}
                              className={`min-w-0 rounded-[24px] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${selected ? "border-primary bg-primary/[0.08] shadow-[0_0_0_1px_rgba(227,54,116,0.28),0_18px_32px_rgba(227,54,116,0.10)] dark:border-primary dark:bg-primary/[0.12]" : "border-border bg-card hover:border-primary/25 hover:bg-primary/[0.03] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"}`}
                              aria-pressed={selected}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`rounded-2xl p-2 ${selected ? "bg-primary text-white" : "bg-muted text-foreground dark:bg-white/10 dark:text-white"}`}
                                >
                                  <role.Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 break-words text-sm font-semibold text-slate-950 dark:text-white">
                                      {role.title}
                                    </div>
                                    {selected && (
                                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary dark:text-[#ff7aa7]" />
                                    )}
                                  </div>
                                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground dark:text-white/62">
                                    {role.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {registrationRole ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <div className="font-medium">{copy.selectedRoleLabel}</div>
                          <div className="mt-1 break-words">
                            {roles.find((role) => role.value === registrationRole)?.note}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                          <span className="break-words">{copy.roleRequired}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="register-email"
                        className="text-foreground/85 dark:text-white/85"
                      >
                        {copy.emailLabel}
                      </Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        autoComplete="email"
                        className="h-12 rounded-2xl border-border bg-card text-slate-950 placeholder:text-slate-400 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-white/28"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="register-password"
                        className="text-foreground/85 dark:text-white/85"
                      >
                        {copy.passwordLabel}
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          name="password"
                          type={showRegisterPassword ? "text" : "password"}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="********"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className="h-12 rounded-2xl border-border bg-card pr-12 text-slate-950 placeholder:text-slate-400 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-white/28"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-white/45 dark:hover:text-white"
                          aria-label={showRegisterPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="register-confirm-password"
                        className="text-foreground/85 dark:text-white/85"
                      >
                        {copy.confirmPasswordLabel}
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-confirm-password"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          placeholder="********"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className="h-12 rounded-2xl border-border bg-card pr-12 text-slate-950 placeholder:text-slate-400 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:placeholder:text-white/28"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-white/45 dark:hover:text-white"
                          aria-label={showConfirmPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                      <Checkbox
                        checked={agreeToTerms}
                        onCheckedChange={(checked) => setAgreeToTerms(Boolean(checked))}
                      />
                      <span className="min-w-0 break-words leading-6 text-muted-foreground dark:text-white/65">
                        {copy.termsLabel}{" "}
                        <Link href="/terms" className="text-primary hover:opacity-80">
                          {copy.termsLink}
                        </Link>{" "}
                        {currentLocale === "en" ? "and" : currentLocale === "uz" ? "va" : "и"}{" "}
                        <Link href="/privacy" className="text-primary hover:opacity-80">
                          {copy.privacyLink}
                        </Link>
                      </span>
                    </label>

                    {registerError && (
                      <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        <AlertDescription>{registerError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-2xl bg-[#e33674] text-white shadow-lg shadow-[#e33674]/25 hover:bg-[#f04a84]"
                      size="lg"
                      disabled={!registerFormValid || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-5 w-5" />
                      )}
                      {copy.registerButton}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
