import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { logger } from "./lib/logger";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Раздаём загруженные файлы
  const uploadsPath = path.resolve(process.cwd(), "server", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Раздаём stock изображения
  const assetsPath = path.resolve(process.cwd(), "attached_assets");
  app.use("/assets", express.static(assetsPath));

  // Serve static files (assets only, excluding HTML)
  app.use((req, res, next) => {
    // Skip HTML files - we'll handle them below with cache busting
    if (req.path.endsWith(".html") || req.path === "/" || !req.path.includes(".")) {
      return next();
    }
    // Serve other static files with long cache
    express.static(distPath, { maxAge: "1y" })(req, res, next);
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // Set no-cache headers for HTML
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Read index.html and inject cache-busting timestamp
    const htmlPath = path.resolve(distPath, "index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const timestamp = Date.now();

    // Add timestamp to all script and CSS tags
    const modifiedHtml = html
      .replace(/src="\/assets\/([^"]+\.js)"/g, 'src="/assets/$1?v=' + timestamp + '"')
      .replace(/href="\/assets\/([^"]+\.css)"/g, 'href="/assets/$1?v=' + timestamp + '"');

    logger.info(`[Cache-busting] Serving HTML with timestamp: ${timestamp}`, { source: "static" });
    res.send(modifiedHtml);
  });
}
