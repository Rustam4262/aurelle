import { Router } from "express";

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

// Sitemap.xml for search engine indexing
router.get("/sitemap.xml", (_req, res) => {
  const baseUrl = process.env.BASE_URL || "https://aurelle.uz";
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Home Page -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- About Page -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Search Page -->
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Authentication Pages -->
  <url>
    <loc>${baseUrl}/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- For Owners Pages -->
  <url>
    <loc>${baseUrl}/owner</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Solo Master Pages -->
  <url>
    <loc>${baseUrl}/solo-master</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <!-- Popular Cities -->
  <url>
    <loc>${baseUrl}/search?city=tashkent</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search?city=samarkand</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search?city=bukhara</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Service Categories -->
  <url>
    <loc>${baseUrl}/search?q=hair</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search?q=nails</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search?q=spa</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  res.type("application/xml");
  res.send(sitemap);
});

export default router;
