// Image optimization using sharp
import sharp from "sharp";
import path from "path";
import fs from "fs";

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
  fit?: "cover" | "contain" | "fill";
}

/**
 * Optimize and convert image to WebP format
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    width,
    height,
    quality = 80,
    format = "webp",
    fit = "cover",
  } = options;

  try {
    let pipeline = sharp(inputPath);

    // Resize if dimensions specified
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        withoutEnlargement: true,
      });
    }

    // Convert to specified format
    switch (format) {
      case "webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "jpeg":
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case "png":
        pipeline = pipeline.png({ quality, progressive: true });
        break;
    }

    // Save optimized image
    await pipeline.toFile(outputPath);

    console.log(`[IMAGE] Optimized: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    return outputPath;
  } catch (error) {
    console.error("[IMAGE] Optimization error:", error);
    throw new Error("Failed to optimize image");
  }
}

/**
 * Create multiple sizes of an image (thumbnails, medium, large)
 */
export async function createImageVariants(
  inputPath: string,
  outputDir: string,
  baseName: string
): Promise<{ thumbnail: string; medium: string; large: string; original: string }> {
  const ext = "webp";

  const variants = {
    thumbnail: path.join(outputDir, `${baseName}_thumb.${ext}`),
    medium: path.join(outputDir, `${baseName}_medium.${ext}`),
    large: path.join(outputDir, `${baseName}_large.${ext}`),
    original: path.join(outputDir, `${baseName}.${ext}`),
  };

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create variants
    await Promise.all([
      optimizeImage(inputPath, variants.thumbnail, { width: 150, height: 150 }),
      optimizeImage(inputPath, variants.medium, { width: 500, height: 500 }),
      optimizeImage(inputPath, variants.large, { width: 1200, height: 1200 }),
      optimizeImage(inputPath, variants.original, { quality: 85 }),
    ]);

    return variants;
  } catch (error) {
    console.error("[IMAGE] Create variants error:", error);
    throw new Error("Failed to create image variants");
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(imagePath: string) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
    };
  } catch (error) {
    console.error("[IMAGE] Get metadata error:", error);
    return null;
  }
}
