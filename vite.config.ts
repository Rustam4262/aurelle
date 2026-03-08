import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Release name used by both sentryVitePlugin (uploads source maps) and injected into
// the browser bundle so the SDK sends the exact same string.
// Priority: VITE_SENTRY_RELEASE → SENTRY_RELEASE → package version fallback.
// In CI: set VITE_SENTRY_RELEASE=aurelle@$(git rev-parse --short HEAD) — one var covers both.
const SENTRY_RELEASE_NAME =
  process.env.VITE_SENTRY_RELEASE ||
  process.env.SENTRY_RELEASE ||
  `aurelle@${process.env.npm_package_version || "1.0.0"}`;

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
            name: SENTRY_RELEASE_NAME,
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
    // Ensure a single React runtime instance across all CJS/ESM boundaries.
    // Without this, use-sync-external-store/shim (CJS, used by react-i18next)
    // can resolve to a separate React module than the one rendering components,
    // causing hooks (useContext inside useTranslation) to throw React Error #321.
    dedupe: ["react", "react-dom"],
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
