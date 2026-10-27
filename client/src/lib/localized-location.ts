import { useBrowserLocation } from "wouter/use-browser-location";
import { isPublicPath, localizedPath, splitLanguage, type Language } from "@shared/public-seo";
import i18n from "./i18n";

// Existing booking/auth routes stay intact; public URLs carry their language.
export function useLocalizedLocation(): [
  string,
  (target: string, options?: { replace?: boolean; state?: unknown }) => void,
] {
  const [location, navigate] = useBrowserLocation();
  const info = splitLanguage(location);
  const valid = !info.localized || isPublicPath(info.path);
  return [
    valid ? info.path : location,
    (target: string, options?: { replace?: boolean; state?: unknown }) => {
      const url = new URL(target, window.location.origin);
      const current = splitLanguage(window.location.pathname);
      const language = current.localized
        ? current.language
        : ((["ru", "uz", "en"].includes(i18n.language) ? i18n.language : "ru") as Language);
      const next =
        isPublicPath(url.pathname) && !splitLanguage(url.pathname).localized
          ? localizedPath(url.pathname, language) + url.search + url.hash
          : target;
      const depth = Number(window.history.state?.aurelleDepth || 0);
      navigate(next, {
        ...options,
        state: {
          ...(options?.state && typeof options.state === "object" ? options.state : {}),
          aurelleDepth: options?.replace ? depth : depth + 1,
        },
      });
    },
  ];
}
