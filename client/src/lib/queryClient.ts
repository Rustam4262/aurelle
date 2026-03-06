import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { logger } from "./logger";
import { emitUpgradeRequired } from "@/components/upgrade-modal";

// Base URL for API requests
// If running on native platform (Android/iOS), use the production server URL
// Otherwise (Web), use relative path (proxy or same origin)
const BASE_URL = Capacitor.isNativePlatform() ? "https://aurelle.uz" : "";

/** Abort fetch after 15 seconds to avoid hanging requests. */
const FETCH_TIMEOUT_MS = 15_000;

/** Prevent multiple simultaneous admin 401 redirects firing in parallel queries. */
let _adminRedirectInProgress = false;

/** Read the CSRF token from the csrf-token cookie (set by the server on every response). */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Build request headers, injecting X-CSRF-Token on mutating methods. */
function buildHeaders(method: string, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  if (!SAFE_METHODS.has(method.toUpperCase())) {
    const token = getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Special handling for not found
    if (res.status === 404) {
      const text = (await res.text()) || res.statusText;
      const error = new Error(`${res.status}: ${text}`);
      (error as Error & { status: number }).status = 404;
      throw error;
    }

    const text = (await res.text()) || res.statusText;

    // 402 Payment Required — show upgrade modal
    if (res.status === 402) {
      try {
        const body = JSON.parse(text) as { feature?: string };
        emitUpgradeRequired({ feature: body.feature ?? "" });
      } catch {
        emitUpgradeRequired({ feature: "" });
      }
    }

    const error = new Error(`${res.status}: ${text}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: buildHeaders(method, !!data),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Handle query params: first element is path, second (if object) is params
      let url: string;
      if (queryKey.length === 1) {
        url = String(queryKey[0]);
      } else {
        const path = String(queryKey[0]);
        const params = queryKey[1];

        if (params && typeof params === "object" && !Array.isArray(params)) {
          // Build query string from params object
          const queryParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, String(value));
            }
          });
          const queryString = queryParams.toString();
          url = queryString ? `${path}?${queryString}` : path;
        } else {
          // Fallback to join if not an object
          url = queryKey.join("/");
        }
      }

      const fullUrl = url.startsWith("/") ? `${BASE_URL}${url}` : url;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(fullUrl, {
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }

      // 401 handling: redirect admin routes to /auth, else return null
      if (res.status === 401) {
        if (
          url.includes("/api/admin/") &&
          !_adminRedirectInProgress &&
          typeof window !== "undefined"
        ) {
          _adminRedirectInProgress = true;
          window.location.replace("/auth");
        }
        if (unauthorizedBehavior === "returnNull") return null;
      }

      if (!res.ok) {
        // Return empty array for not found errors to prevent crash
        if (res.status === 404) {
          logger.warn(`API endpoint not found: ${queryKey.join("/")}`, { source: "queryClient" });
          // Return appropriate empty structure based on endpoint
          const endpoint = queryKey.join("/");
          if (endpoint.includes("/api/master/me")) {
            return null; // Master profile not found
          }
          if (
            endpoint.endsWith("/bookings") ||
            endpoint.endsWith("/masters") ||
            endpoint.endsWith("/reviews")
          ) {
            return []; // Return empty array for list endpoints
          }
          throw new Error(`Not found: ${res.statusText}`);
        }

        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return await res.json();
    } catch (error) {
      logger.error("Query function error", error, { source: "queryClient" });
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // returnNull on 401: guest users on public pages won't crash the app.
      // Protected pages use ProtectedRoute which guarantees auth before rendering,
      // so 401 won't happen there in normal flow. If token expires mid-session,
      // the user gets null data gracefully instead of an ErrorBoundary.
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false, // don't retry 401/404 — they're expected states, not transient errors
    },
    mutations: {
      retry: false,
    },
  },
});
