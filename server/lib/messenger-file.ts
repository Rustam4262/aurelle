import sharp from "sharp";
export const MESSENGER_FILE_LIMIT = 8 * 1024 * 1024;
export async function prepareMessengerFile(file: Express.Multer.File) {
  // Multipart filenames without charset are decoded as Latin-1 by Busboy.
  const decoded = Buffer.from(file.originalname, "latin1").toString("utf8");
  const originalName =
    !decoded.includes("\uFFFD") &&
    Buffer.from(decoded, "utf8").toString("latin1") === file.originalname
      ? decoded
      : file.originalname;
  const name =
    originalName
      .normalize("NFKC")
      .replace(/[\x00-\x1f\x7f/\\]/g, "_")
      .slice(0, 160) || "attachment";
  if (!file.buffer.length || file.buffer.length > MESSENGER_FILE_LIMIT)
    throw new Error("INVALID_FILE");
  if (file.buffer.subarray(0, 5).toString() === "%PDF-" && file.mimetype === "application/pdf") {
    return {
      name: name.replace(/\.pdf$/i, "") + ".pdf",
      contentType: "application/pdf",
      data: file.buffer,
    };
  }
  const image = sharp(file.buffer, { limitInputPixels: 24_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("INVALID_FILE");
  // Re-encode rather than serving arbitrary uploads; strips EXIF/GPS and embedded metadata.
  const data = await image
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  if (data.length > MESSENGER_FILE_LIMIT) throw new Error("INVALID_FILE");
  return { name: name.replace(/\.[^.]+$/, "") + ".webp", contentType: "image/webp", data };
}
