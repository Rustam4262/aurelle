import fs from "fs";
import path from "path";

/**
 * Initialize upload directories
 * Creates the necessary directories for file uploads if they don't exist
 */
export function initializeUploadDirectories() {
  const uploadsBasePath = path.join(process.cwd(), "server", "uploads");
  const uploadTypes = ["salons", "masters", "portfolio", "avatars"];

  // Create base uploads directory
  if (!fs.existsSync(uploadsBasePath)) {
    fs.mkdirSync(uploadsBasePath, { recursive: true });
    console.log(`✓ Created uploads directory: ${uploadsBasePath}`);
  }

  // Create subdirectories for each upload type
  uploadTypes.forEach((type) => {
    const typePath = path.join(uploadsBasePath, type);
    if (!fs.existsSync(typePath)) {
      fs.mkdirSync(typePath, { recursive: true });
      console.log(`✓ Created upload directory: ${typePath}`);
    }
  });

  console.log("✓ Upload directories initialized");
}
