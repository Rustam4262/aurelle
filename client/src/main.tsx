import { createRoot } from "react-dom/client";
import "./lib/i18n";
import { initializeSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry for error monitoring
initializeSentry();

// Register Service Worker for PWA (offline support, push notifications, install prompt)
if ("serviceWorker" in navigator) {
  // Track whether there was already a controller before registration so we can
  // distinguish a first-time install (no reload needed) from an update (reload needed).
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });
  });

  // Guard against reloading more than once per tab.
  let reloadScheduled = false;

  const scheduleReload = () => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    // Small delay so any in-flight navigation/render can settle before reload.
    setTimeout(() => window.location.reload(), 200);
  };

  // Primary: SW explicitly signals it has activated with a new version.
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED" && hadController) {
      scheduleReload();
    }
  });

  // Fallback: controller changed (new SW took over via skipWaiting + clients.claim).
  // Only reload if there was already a controller — avoids reload on first-ever install.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) {
      scheduleReload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
