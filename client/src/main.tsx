import { createRoot } from "react-dom/client";
import "./lib/i18n";
import { initializeSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry for error monitoring
initializeSentry();

// Register Service Worker for PWA (offline support, push notifications, install prompt)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
