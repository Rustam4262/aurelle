import type { Express, Request, Response } from "express";
import { upload, setUploadType, optimizeImage, getFileUrl } from "./upload";
import { isAuthenticated } from "./auth";
import path from "path";
import fs from "fs/promises";
import { db } from "./db";
import { salons, masters, masterPortfolio, userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerUploadRoutes(app: Express) {
  // ============ UPLOAD ENDPOINTS ============

  // Upload salon photo
  app.post(
    "/api/upload/salon-photo",
    isAuthenticated,
    setUploadType("salons"),
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Оптимизируем изображение
        const optimizedBuffer = await optimizeImage(req.file.path, {
          width: 1200,
          quality: 85,
        });

        // Сохраняем оптимизированную версию
        await fs.writeFile(req.file.path, optimizedBuffer);

        const fileUrl = getFileUrl(req.file.filename, "salons");

        return res.json({
          success: true,
          url: fileUrl,
          filename: req.file.filename,
        });
      } catch (error) {
        console.error("Upload salon photo error:", error);
        return res.status(500).json({ error: "Failed to upload photo" });
      }
    }
  );

  // Upload master photo
  app.post(
    "/api/upload/master-photo",
    isAuthenticated,
    setUploadType("masters"),
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Оптимизируем изображение
        const optimizedBuffer = await optimizeImage(req.file.path, {
          width: 800,
          quality: 85,
        });

        await fs.writeFile(req.file.path, optimizedBuffer);

        const fileUrl = getFileUrl(req.file.filename, "masters");

        return res.json({
          success: true,
          url: fileUrl,
          filename: req.file.filename,
        });
      } catch (error) {
        console.error("Upload master photo error:", error);
        return res.status(500).json({ error: "Failed to upload photo" });
      }
    }
  );

  // Upload portfolio image
  app.post(
    "/api/upload/portfolio",
    isAuthenticated,
    setUploadType("portfolio"),
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Оптимизируем изображение
        const optimizedBuffer = await optimizeImage(req.file.path, {
          width: 1000,
          quality: 85,
        });

        await fs.writeFile(req.file.path, optimizedBuffer);

        const fileUrl = getFileUrl(req.file.filename, "portfolio");

        return res.json({
          success: true,
          url: fileUrl,
          filename: req.file.filename,
        });
      } catch (error) {
        console.error("Upload portfolio error:", error);
        return res.status(500).json({ error: "Failed to upload photo" });
      }
    }
  );

  // Upload avatar
  app.post(
    "/api/upload/avatar",
    isAuthenticated,
    setUploadType("avatars"),
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Оптимизируем и делаем квадратным
        const optimizedBuffer = await optimizeImage(req.file.path, {
          width: 400,
          height: 400,
          quality: 85,
        });

        await fs.writeFile(req.file.path, optimizedBuffer);

        const fileUrl = getFileUrl(req.file.filename, "avatars");

        return res.json({
          success: true,
          url: fileUrl,
          filename: req.file.filename,
        });
      } catch (error) {
        console.error("Upload avatar error:", error);
        return res.status(500).json({ error: "Failed to upload avatar" });
      }
    }
  );

  // Delete uploaded file (generic)
  app.delete("/api/upload/:type/:filename", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type, filename } = req.params;

      // Валидация типа
      const allowedTypes = ["salons", "masters", "portfolio", "avatars"];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid upload type" });
      }

      const filePath = path.join(process.cwd(), "server", "uploads", type, filename);

      // Проверяем существование файла
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: "File not found" });
      }

      // Удаляем файл
      await fs.unlink(filePath);

      return res.json({ success: true, message: "File deleted" });
    } catch (error) {
      console.error("Delete file error:", error);
      return res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Upload multiple salon photos
  app.post(
    "/api/upload/salon-photos",
    isAuthenticated,
    setUploadType("salons"),
    upload.array("images", 10), // Максимум 10 фото
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        // Оптимизируем все изображения
        const urls = await Promise.all(
          files.map(async (file) => {
            const optimizedBuffer = await optimizeImage(file.path, {
              width: 1200,
              quality: 85,
            });
            await fs.writeFile(file.path, optimizedBuffer);
            return getFileUrl(file.filename, "salons");
          })
        );

        return res.json({
          success: true,
          urls,
        });
      } catch (error) {
        console.error("Upload salon photos error:", error);
        return res.status(500).json({ error: "Failed to upload photos" });
      }
    }
  );
}
