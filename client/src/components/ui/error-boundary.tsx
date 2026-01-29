import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Alert, AlertDescription, AlertTitle } from "./alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // TODO: Send to Sentry
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Что-то пошло не так</CardTitle>
              </div>
              <CardDescription>Произошла ошибка при отображении этого раздела</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <Alert variant="destructive">
                  <AlertTitle>Детали ошибки</AlertTitle>
                  <AlertDescription className="font-mono text-xs break-all">
                    {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Попробовать снова
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Перезагрузить страницу
                </Button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Stack trace (dev only)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based API error boundary for Query errors
export function QueryErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки данных</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{error.message || "Не удалось загрузить данные с сервера"}</p>
          <Button onClick={resetErrorBoundary} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-3 w-3 mr-2" />
            Повторить попытку
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
