import { splitLanguage, localizedPath, isPublicPath } from "./public-seo";
export const SITE_ORIGIN = "https://aurelle.uz";
const publicPaths = new Set([
  "/",
  "/about",
  "/terms",
  "/privacy",
  "/pricing",
  "/search",
  "/salons",
]);
const privatePaths = new Set([
  "/choose-role",
  "/auth",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/login",
  "/profile",
  "/accept-invitation",
  "/owner",
  "/master",
  "/client",
  "/messenger",
  "/solo-master",
  "/solo-master/onboarding",
]);

export function documentPolicy(input: string) {
  const url = new URL(input, SITE_ORIGIN);
  const normalized = url.pathname.replace(/\/$/, "") || "/";
  const { path, localized } = splitLanguage(normalized);
  const privatePage =
    privatePaths.has(path) || /^\/admin(?:\/|$)/.test(path) || /^\/owner\/salon\/[^/]+$/.test(path);
  const known = localized
    ? isPublicPath(path)
    : privatePage || publicPaths.has(path) || /^\/(salon|master)\/[^/]+$/.test(path);
  const search = path === "/search" || path === "/salons";
  const filtered =
    search &&
    Array.from(url.searchParams.keys()).some((k) =>
      ["q", "city", "category", "tab", "audience", "rating", "sort"].includes(k),
    );
  return { status: known ? 200 : 404, noIndex: privatePage || !known || filtered };
}

export function canonicalUrl(input: string) {
  const url = new URL(input, SITE_ORIGIN);
  const info = splitLanguage(url.pathname.replace(/\/$/, "") || "/");
  const basePath = info.path === "/salons" ? "/search" : info.path;
  const path = isPublicPath(basePath) ? localizedPath(basePath, info.language) : basePath;
  const canonical = new URL(path, SITE_ORIGIN);
  if (basePath === "/search") {
    for (const key of ["audience", "category", "city", "q", "rating", "sort", "tab"]) {
      const value = url.searchParams.get(key);
      if (value) canonical.searchParams.set(key, value);
    }
  }
  return canonical.href;
}

export function xmlEscape(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}
