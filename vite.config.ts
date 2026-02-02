import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Sentry plugin for source maps upload (only in production builds)
    ...(process.env.NODE_ENV === "production" && process.env.SENTRY_AUTH_TOKEN
      ? [
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: {
            name:
              process.env.SENTRY_RELEASE ||
              `aurelle@${process.env.npm_package_version || "1.0.0"}`,
            uploadLegacySourcemaps: {
              paths: ["dist/public"],
            },
          },
          sourcemaps: {
            assets: ["dist/public/**"],
            ignore: ["node_modules"],
            filesToDeleteAfterUpload: ["dist/public/**/*.map"],
          },
          telemetry: false,
        }),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true, // Enable source maps for Sentry
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
