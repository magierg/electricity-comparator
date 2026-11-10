import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              The comparison could not be displayed. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Refresh page
            </button>
            {this.state.error ? (
              <details className="mt-5 text-left">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-red-700 dark:bg-slate-950 dark:text-red-300">
                  {this.state.error.toString()}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
