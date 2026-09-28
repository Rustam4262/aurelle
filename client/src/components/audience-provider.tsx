import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";

type Audience = "women" | "men";
const Context = createContext<{ audience: Audience; setAudience: (value: Audience) => void }>({
  audience: "women",
  setAudience: () => {},
});
const key = "aurelle-audience";

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [audience, setAudience] = useState<Audience>(() => {
    try {
      return localStorage.getItem(key) === "men" ? "men" : "women";
    } catch {
      return "women";
    }
  });
  useEffect(() => {
    const business =
      /^\/(owner|admin|solo-master|master)(\/|$)/.test(path) && !path.startsWith("/master/");
    document.documentElement.dataset.audience = business ? "business" : audience;
    try {
      localStorage.setItem(key, audience);
    } catch {
      /* Storage may be disabled. */
    }
  }, [audience, path]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key) setAudience(event.newValue === "men" ? "men" : "women");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return <Context.Provider value={{ audience, setAudience }}>{children}</Context.Provider>;
}

export const useAudience = () => useContext(Context);

export function AudienceSwitch() {
  const { audience, setAudience } = useAudience();
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("audience.choose")}
      className="mb-6 inline-flex w-full max-w-sm gap-1 rounded-full border border-border bg-card/90 p-1 shadow-sm"
    >
      {(["women", "men"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={audience === value}
          onClick={() => setAudience(value)}
          className={`min-h-11 flex-1 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${audience === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          data-testid={`audience-${value}`}
        >
          {t(`audience.${value}`)}
        </button>
      ))}
    </div>
  );
}

export function AudienceLabel() {
  const { audience } = useAudience();
  const { t } = useTranslation();
  return (
    <Link
      href="/"
      className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary mb-3"
    >
      {t(`audience.${audience}`)} · {t("audience.change")}
    </Link>
  );
}
