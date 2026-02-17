import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { logger } from "./logger";

// Base URL for API requests
// If running on native platform (Android/iOS), use the production server URL
// Otherwise (Web), use relative path (proxy or same origin)
const BASE_URL = Capacitor.isNativePlatform() ? "https://aurelle.uz" : "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Special handling for not found
    if (res.status === 404) {
      const text = (await res.text()) || res.statusText;
      const error = new Error(`${res.status}: ${text}`);
      (error as any).status = 404;
      throw error;
    }

    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      try {
        const url = queryKey.join("/");
        const fullUrl = url.startsWith("/") ? `${BASE_URL}${url}` : url;
        const res = await fetch(fullUrl, {
          credentials: "include",
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
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
            if (endpoint.endsWith("/bookings") || endpoint.endsWith("/masters") || endpoint.endsWith("/reviews")) {
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
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1, // Retry once for transient errors
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
