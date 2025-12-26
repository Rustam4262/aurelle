import multer from "multer";
import sharp from "sharp";
import path from "path";
import { Request } from "express";
import crypto from "crypto";

// Конфигурация хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Определяем папку в зависимости от типа загрузки
    const uploadType = (req as any).uploadType || "general";
    const uploadPath = path.join(process.cwd(), "server", "uploads", uploadType);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 20);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  },
});

// Фильтр файлов - только изображения
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and WebP images are allowed."));
  }
};

// Настройка multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB максимум
  },
});

// Middleware для установки типа загрузки
export const setUploadType = (type: "salons" | "masters" | "portfolio" | "avatars") => {
  return (req: Request, res: any, next: any) => {
    (req as any).uploadType = type;
    next();
  };
};

// Функция оптимизации изображения
export async function optimizeImage(
  inputPath: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<Buffer> {
  const { width = 1200, height, quality = 85 } = options;

  let transformer = sharp(inputPath).resize(width, height, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Конвертируем в JPEG для уменьшения размера
  return transformer.jpeg({ quality }).toBuffer();
}

// Функция создания thumbnail
export async function createThumbnail(inputPath: string, size: number = 300): Promise<Buffer> {
  return sharp(inputPath)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// Получить публичный URL файла
export function getFileUrl(filename: string, type: string): string {
  if (!filename) return "";

  // Если это уже полный URL (старые данные)
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Генерируем URL для локального файла
  return `/uploads/${type}/${filename}`;
}

// Извлечь имя файла из URL
export function getFilenameFromUrl(url: string): string | null {
  if (!url) return null;

  // Если это локальный URL
  if (url.startsWith("/uploads/")) {
    return path.basename(url);
  }

  return null;
}
