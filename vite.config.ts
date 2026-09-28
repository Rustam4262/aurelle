import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { execSync } from "child_process";

// Git short SHA baked into the bundle at build time.
// Available as __APP_VERSION__ in client code and window.__APP_VERSION__ at runtime.
// Fallback to "dev" in local dev (no git, or dirty tree without a commit).
const GIT_COMMIT_SHA = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
})();

// Release name used by both sentryVitePlugin (uploads source maps) and injected into
// the browser bundle so the SDK sends the exact same string.
// Priority: VITE_SENTRY_RELEASE → SENTRY_RELEASE → aurelle@<git-sha>
// In CI: set VITE_SENTRY_RELEASE=aurelle@$(git rev-parse --short HEAD) — one var covers both.
const SENTRY_RELEASE_NAME =
  process.env.VITE_SENTRY_RELEASE || process.env.SENTRY_RELEASE || `aurelle@${GIT_COMMIT_SHA}`;

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
  define: {
    // Bake git SHA into the bundle — readable in devtools as window.__APP_VERSION__
    __APP_VERSION__: JSON.stringify(GIT_COMMIT_SHA),
  },
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
    // Production currently serves the entry asset with a cache-busting `?v=...`
    // suffix in HTML. ES module URLs are query-sensitive, so sibling chunks that
    // import `./index-*.js` without that suffix instantiate a second copy of the
    // entry module and React runtime, which triggers `Minified React error #321`.
    //
    // A single bundled entry avoids cross-chunk imports back into the entry
    // module, so the app keeps exactly one React instance even if HTML asset URLs
    // are rewritten upstream.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
