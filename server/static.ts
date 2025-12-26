import express, { type Express } from "express";
import fs from "fs";
import path from "path";

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

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
