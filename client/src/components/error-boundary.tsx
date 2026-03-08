import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import i18n from "@/lib/i18n";
import { captureException } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorKey: number;
  /** True after a chunk-load auto-reload was attempted and failed a second time. */
  reloadAttempted: boolean;
}

const CHUNK_RELOAD_KEY = "chunk_reload_attempted";

/**
 * Returns true for errors thrown when React.lazy() or a dynamic import()
 * fails to load a chunk (e.g. after a deployment where old chunk URLs no
 * longer exist on the server). Accepts `unknown` so it is safe to call with
 * any value caught in a catch clause.
 */
function isChunkLoadError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const msg = typeof e.message === "string" ? e.message : "";
  const name = typeof e.name === "string" ? e.name : "";
  return (
    name === "ChunkLoadError" ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed")
  );
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree.
 *
 * NOTE: Uses i18n.t() directly (not useTranslation hook) to avoid
 * React Error #321 — calling setState during render when withTranslation()
 * HOC subscribes to i18n inside the error recovery cycle.
 *
 * Chunk-load error lifecycle:
 *   1st catch → spinner + auto-reload (sessionStorage guard prevents loop)
 *   2nd catch → user-visible "app updated" card with manual reload button
 *   All other errors → standard error card (no auto-reload)
 */
class ErrorBoundaryComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorKey: 0,
      reloadAttempted: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // CRITICAL: always return hasError: true — never return hasError: false.
    //
    // Returning hasError: false for ChunkLoadError was incorrect and caused
    // an infinite render loop + React Error #321:
    //   1. getDerivedStateFromError returns { hasError: false }
    //   2. ErrorBoundary re-renders children (because hasError is false)
    //   3. React.lazy is permanently "rejected" → throws ChunkLoadError again
    //   4. getDerivedStateFromError called again → loop back to step 1
    //
    // The infinite loop corrupts React's internal fiber/dispatcher state.
    // When React attempts to render any component in this broken state,
    // useContext (inside useTranslation) throws React Error #321 because
    // there is no active hook dispatcher.
    //
    // Fix: always set hasError: true. The chunk error path shows a minimal
    // "updating" spinner instead of the full error card, and reloads immediately
    // in componentDidCatch (no render loop possible since children are unmounted).
    return { hasError: true, error, errorInfo: null, reloadAttempted: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ── Chunk-load errors (stale cache after deploy) ───────────────────────────
    // hasError is already true (set by getDerivedStateFromError above), so
    // children are unmounted — no re-throw loop is possible.
    if (isChunkLoadError(error)) {
      const alreadyAttempted = !!sessionStorage.getItem(CHUNK_RELOAD_KEY);

      if (!alreadyAttempted) {
        // First occurrence: attempt a hard reload to fetch fresh bundles.
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        logger.warn("ChunkLoadError — reloading page to fetch new bundles", {
          source: "error-boundary",
        });
        // Capture before reload so we have a record (Sentry queues async).
        captureException(error, {
          errorType: "chunk-load",
          location: window.location.href,
          appVersion: __APP_VERSION__,
          reloadAttempted: false,
          componentStack: errorInfo.componentStack ?? undefined,
        });
        window.location.reload();
        return;
      }

      // Second occurrence: reload did not help — stop the loop, show fallback UI.
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }

    // ── All other errors (and second chunk-load attempt) ──────────────────────
    logger.error("ErrorBoundary caught an error", error, {
      source: "error-boundary",
      meta: errorInfo as unknown as Record<string, unknown>,
    });

    captureException(error, {
      errorType: isChunkLoadError(error) ? "chunk-load-retry-failed" : "runtime",
      location: window.location.href,
      appVersion: __APP_VERSION__,
      reloadAttempted: isChunkLoadError(error),
      componentStack: errorInfo.componentStack ?? undefined,
    });

    this.setState({
      hasError: true,
      error,
      errorInfo,
      reloadAttempted: isChunkLoadError(error),
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorKey: this.state.errorKey + 1,
        reloadAttempted: false,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorKey: this.state.errorKey + 1,
      reloadAttempted: false,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Chunk-load error — FIRST occurrence:
      // Spinner visible only for ~100ms while componentDidCatch fires reload().
      if (this.state.error && isChunkLoadError(this.state.error) && !this.state.reloadAttempted) {
        return (
          <div
            data-testid="chunk-error-loading"
            className="min-h-screen bg-background flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );
      }

      // Use i18n.t() directly — NOT useTranslation() hook — so we never
      // trigger a React state update from inside the error boundary render.
      const t = i18n.t.bind(i18n);

      // Chunk-load error — SECOND occurrence (reload attempted, still failing):
      // Show a user-friendly "app updated" card with a manual reload button.
      // This prevents an infinite reload loop while giving the user a clear action.
      if (this.state.error && isChunkLoadError(this.state.error)) {
        return (
          <div
            data-testid="chunk-error-fallback"
            className="min-h-screen bg-background flex items-center justify-center p-6"
          >
            <Card className="max-w-lg w-full p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <RefreshCcw className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>

              <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
                {t("errorBoundary.updateRequired", "Приложение обновилось")}
              </h1>

              <p className="text-muted-foreground mb-6">
                {t(
                  "errorBoundary.chunkLoadDescription",
                  "Обнаружена новая версия. Перезагрузите страницу, чтобы продолжить.",
                )}
              </p>

              <Button
                data-testid="chunk-error-reload-button"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                {t("errorBoundary.reloadPage", "Перезагрузить страницу")}
              </Button>

              {process.env.NODE_ENV === "development" && (
                <p className="mt-4 text-xs text-muted-foreground font-mono">v{__APP_VERSION__}</p>
              )}
            </Card>
          </div>
        );
      }

      // General runtime error
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
              {t("errorBoundary.title", "Что-то пошло не так")}
            </h1>

            <p className="text-muted-foreground mb-6">
              {t("errorBoundary.description", "Произошла непредвиденная ошибка.")}
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-destructive mb-2">
                  {t("errorBoundary.technicalDetails", "Технические детали")}
                </summary>
                <div className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-48">
                  <p className="font-mono text-destructive mb-2">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                {t("errorBoundary.tryAgain", "Попробовать снова")}
              </Button>

              <Button onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                {t("errorBoundary.goHome", "На главную")}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ErrorBoundaryComponent;

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

/**
 * Compact ErrorFallback for smaller sections
 */
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const t = i18n.t.bind(i18n);

  return (
    <Card className="p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h3 className="font-medium text-foreground mb-2">
        {t("errorBoundary.errorLoading", "Ошибка загрузки")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || t("errorBoundary.somethingWentWrong", "Что-то пошло не так")}
      </p>
      <Button size="sm" variant="outline" onClick={resetError}>
        <RefreshCcw className="h-4 w-4 mr-2" />
        {t("errorBoundary.retry", "Повторить")}
      </Button>
    </Card>
  );
}
