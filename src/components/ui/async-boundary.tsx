import * as React from "react";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

interface ErrorBoundaryProps {
  fallback: (props: { error: Error; reset: () => void }) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[AsyncBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

/**
 * Combines an ErrorBoundary + Suspense with standard fallbacks.
 *
 * @example
 * <AsyncBoundary>
 *   <MyRoute />
 * </AsyncBoundary>
 */
export interface AsyncBoundaryProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: (props: { error: Error; reset: () => void }) => React.ReactNode;
}

export function AsyncBoundary({
  children,
  loadingFallback,
  errorFallback,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        errorFallback ??
        (({ reset }) => (
          <div className="p-4">
            <ErrorState onRetry={reset} />
          </div>
        ))
      }
    >
      <React.Suspense fallback={loadingFallback ?? <LoadingState />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

export { ErrorBoundary };
