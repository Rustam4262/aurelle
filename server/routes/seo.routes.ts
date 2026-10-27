import { Router } from "express";
import { globalLimiter } from "../middleware/rateLimiter";
import { SITE_ORIGIN, xmlEscape } from "@shared/seo-policy";
import { languages, localizedPath, splitLanguage, isPublicPath } from "@shared/public-seo";
import { readPublicCatalog, landingLinks, getPublicDocument } from "../lib/public-catalog";
const router = Router();
router.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
});
router.get("/sitemap.xml", async (_req, res) => {
  try {
    const listings = await readPublicCatalog("ru");
    const paths = Array.from(
      new Set([
        "/",
        "/search",
        ...listings.map((s) => s.path),
        ...landingLinks(listings, "ru").map((l) => l.path),
      ]),
    );
    const urls = paths.flatMap((path) =>
      languages.map((lang) => {
        const alternates = [
          ...languages.map(
            (l) =>
              `<xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(SITE_ORIGIN + localizedPath(path, l))}"/>`,
          ),
          `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(SITE_ORIGIN + localizedPath(path, "ru"))}"/>`,
        ].join("");
        return `<url><loc>${xmlEscape(SITE_ORIGIN + localizedPath(path, lang))}</loc>${alternates}</url>`;
      }),
    );
    // No invented lastmod: service changes do not necessarily touch salon.updatedAt.
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("\n")}</urlset>`,
      );
  } catch {
    res.status(503).set("Retry-After", "300").send("Sitemap temporarily unavailable");
  }
});
router.get("/api/public-document", globalLimiter, async (req, res) => {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 2048)
    return res.status(400).json({ error: "Invalid path" });
  const data = await getPublicDocument(path);
  res.set("Cache-Control", "no-store");
  if (!data) return res.status(404).json({ error: "Not found" });
  if (data.status === 503) res.set("Retry-After", "300");
  return res.status(data.status).json(data);
});
router.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const url = new URL(req.originalUrl, SITE_ORIGIN);
  const normalized = url.pathname.replace(/\/$/, "") || "/";
  const info = splitLanguage(normalized);
  if (!isPublicPath(normalized)) return next();
  const target = localizedPath(info.path === "/salons" ? "/search" : info.path, info.language);
  if (url.pathname !== target) return res.redirect(301, target + url.search);
  next();
});
export default router;
