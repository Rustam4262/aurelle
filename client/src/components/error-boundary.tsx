import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

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
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Displays a fallback UI instead of crashing the whole app
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
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
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    logger.error("ErrorBoundary caught an error", error, {
      source: "error-boundary",
      meta: errorInfo,
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // Reset error state when children change (e.g., navigation)
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
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
              Что-то пошло не так
            </h1>

            <p className="text-muted-foreground mb-6">
              Приложение столкнулось с неожиданной ошибкой. Пожалуйста, попробуйте перезагрузить
              страницу или вернитесь на главную.
            </p>

            {/* Show error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-destructive mb-2">
                  Технические детали (только в dev режиме)
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
                Попробовать снова
              </Button>

              <Button onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                На главную
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Note: This is a workaround since hooks can't catch errors in children
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
  return (
    <Card className="p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h3 className="font-medium text-foreground mb-2">Ошибка загрузки</h3>
      <p className="text-sm text-muted-foreground mb-4">{error.message || "Что-то пошло не так"}</p>
      <Button size="sm" variant="outline" onClick={resetError}>
        <RefreshCcw className="h-4 w-4 mr-2" />
        Повторить
      </Button>
    </Card>
  );
}
