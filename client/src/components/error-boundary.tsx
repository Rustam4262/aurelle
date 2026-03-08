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
}

/**
 * Returns true for errors thrown when React.lazy() fails to load a chunk
 * (e.g. after a deployment where old chunk URLs no longer exist on the server).
 * The standard fix is a hard reload so the browser fetches the new index.html
 * and resolves the new chunk URLs.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error?.message ?? "";
  const name = error?.name ?? "";
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
 */
class ErrorBoundaryComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorKey: 0,
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
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Chunk load errors (stale cache after deploy): reload once immediately.
    // hasError is already true (set by getDerivedStateFromError above), so
    // children are unmounted — no re-throw loop is possible.
    if (isChunkLoadError(error)) {
      if (!sessionStorage.getItem("chunk_reload_attempted")) {
        sessionStorage.setItem("chunk_reload_attempted", "1");
        logger.warn("ChunkLoadError — reloading page to fetch new bundles", {
          source: "error-boundary",
        });
        window.location.reload();
        return;
      }
      // Second attempt also failed: clear the flag and show the normal error UI.
      sessionStorage.removeItem("chunk_reload_attempted");
    }

    logger.error("ErrorBoundary caught an error", error, {
      source: "error-boundary",
      meta: errorInfo as unknown as Record<string, unknown>,
    });

    captureException(error, { componentStack: errorInfo.componentStack ?? undefined });

    this.setState({ hasError: true, error, errorInfo });

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
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorKey: this.state.errorKey + 1,
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

      // Chunk load errors: show a minimal spinner while the page reloads.
      // componentDidCatch fires window.location.reload() immediately after
      // getDerivedStateFromError — this fallback is visible only for ~100ms.
      if (this.state.error && isChunkLoadError(this.state.error)) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );
      }

      // Use i18n.t() directly — NOT useTranslation() hook — so we never
      // trigger a React state update from inside the error boundary render.
      const t = i18n.t.bind(i18n);

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
      <h3 className="font-medium text-foreground mb-2">{t("errorBoundary.errorLoading", "Ошибка загрузки")}</h3>
      <p className="text-sm text-muted-foreground mb-4">{error.message || t("errorBoundary.somethingWentWrong", "Что-то пошло не так")}</p>
      <Button size="sm" variant="outline" onClick={resetError}>
        <RefreshCcw className="h-4 w-4 mr-2" />
        {t("errorBoundary.retry", "Повторить")}
      </Button>
    </Card>
  );
}
