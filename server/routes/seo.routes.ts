import { Router } from "express";
import { db } from "../db";
import { salons, masters } from "@shared/schema";
import { and, isNotNull } from "drizzle-orm";

const router = Router();

// Robots.txt for search engine crawlers
router.get("/robots.txt", (_req, res) => {
  const robots = `# AURELLE Marketplace - Beauty Salons Platform
# https://aurelle.uz

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /owner
Disallow: /master
Disallow: /client
Disallow: /auth
Crawl-delay: 1

Sitemap: https://aurelle.uz/sitemap.xml

# Google Search Console
User-agent: Googlebot
Allow: /
Crawl-delay: 0
`;

  res.type("text/plain");
  res.send(robots);
});

// Sitemap.xml for search engine indexing (Dynamic with salons and masters)
router.get("/sitemap.xml", async (_req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || "https://aurelle.uz";
    const today = new Date().toISOString().split('T')[0];

    // Fetch all active salons
    const allSalons = await db
      .select({
        id: salons.id,
        updatedAt: salons.updatedAt,
      })
      .from(salons);

    // Fetch all active masters with slugs
    const allMasters = await db
      .select({
        slug: masters.slug,
        updatedAt: masters.createdAt,
      })
      .from(masters)
      .where(isNotNull(masters.slug));

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/auth</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Cities -->
  <url>
    <loc>${baseUrl}/search?city=tashkent</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search?city=samarkand</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/search?city=bukhara</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Service Categories -->
  <url>
    <loc>${baseUrl}/search?q=hair</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search?q=nails</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search?q=spa</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Dynamic Salon Pages -->
`;

    // Add salon URLs
    for (const salon of allSalons) {
      const lastmod = salon.updatedAt ? new Date(salon.updatedAt).toISOString().split('T')[0] : today;
      sitemap += `  <url>
    <loc>${baseUrl}/salon/${salon.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    // Add master URLs
    for (const master of allMasters) {
      if (master.slug) {
        const lastmod = master.updatedAt ? new Date(master.updatedAt).toISOString().split('T')[0] : today;
        sitemap += `  <url>
    <loc>${baseUrl}/master/${master.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    res.type("application/xml");
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
