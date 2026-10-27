import { mkdir, writeFile, unlink } from "node:fs/promises";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { Request } from "express";
import crypto from "crypto";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const invalidImage = () => Object.assign(new Error("Invalid image. Use JPEG, PNG or WebP."), { status: 400 });

// Decode and re-encode before creating a publicly served file. Neither MIME nor
// the supplied filename is evidence of the actual image format.
const storage: multer.StorageEngine = {
  _handleFile(req, file, cb) {
    void (async () => {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of file.stream) {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) throw new multer.MulterError("LIMIT_FILE_SIZE");
        chunks.push(Buffer.from(chunk));
      }
      if ((file.stream as typeof file.stream & { truncated?: boolean }).truncated) {
        throw new multer.MulterError("LIMIT_FILE_SIZE");
      }
      const input = Buffer.concat(chunks);
      let output: Buffer;
      try {
        const image = sharp(input, { limitInputPixels: 20_000_000, failOn: "warning" });
        const metadata = await image.metadata();
        if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
          throw invalidImage();
        }
        output = await image.rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 90 }).toBuffer();
      } catch {
        throw invalidImage();
      }
      const type = (req as any).uploadType || "general";
      if (!["general", "salons", "masters", "portfolio", "avatars"].includes(type)) throw invalidImage();
      const destination = path.join(process.cwd(), "server", "uploads", type);
      const filename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
      const outputPath = path.join(destination, filename);
      await mkdir(destination, { recursive: true });
      try { await writeFile(outputPath, output, { flag: "wx" }); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") await unlink(outputPath).catch(() => {});
        throw error;
      }
      return { destination, filename, path: outputPath, size: output.length };
    })().then(result => cb(null, result), error => cb(error));
  },
  _removeFile(_req, file, cb) {
    unlink(file.path).then(() => cb(null), error => cb(error));
  },
};

// Фильтр файлов - только изображения
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(invalidImage());
  }
};

// Настройка multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 10,
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
  } = {},
): Promise<Buffer> {
  const { width = 1200, height, quality = 85 } = options;

  const transformer = sharp(inputPath).resize(width, height, {
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
