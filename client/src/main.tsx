import { createRoot } from "react-dom/client";
import "./lib/i18n";
import { initializeSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry for error monitoring
initializeSentry();

createRoot(document.getElementById("root")!).render(<App />);
