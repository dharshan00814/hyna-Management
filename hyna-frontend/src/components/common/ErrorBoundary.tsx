import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Hyna ErrorBoundary] Caught an unhandled UI error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Filter out any potential sensitive tokens or database URLs from error message
      const sanitizedMessage = (this.state.error?.message || 'An unexpected rendering error occurred.')
        .replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
        .replace(/https:\/\/[a-zA-Z0-9_-]+\.supabase\.co/g, '[SUPABASE_URL]');

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--color-background)] text-[var(--color-foreground)] select-none">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-[28px] bg-white dark:bg-[#151821] border border-[var(--color-border)] shadow-xl text-center space-y-6 animate-scale-in">
            {/* Warning Icon with Glow */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 dark:bg-amber-400/10 blur-xl animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto leading-relaxed">
                We encountered an unexpected issue while loading this view. You can reload the page or return to the dashboard.
              </p>
            </div>

            {/* Technical details toggle (sanitized, no secrets exposed) */}
            <div className="text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                <span>Technical details</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 font-mono text-[11px] text-[var(--color-muted-foreground)] break-words max-h-32 overflow-y-auto">
                  {sanitizedMessage}
                </div>
              )}
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#11141A] text-white hover:bg-black dark:bg-white dark:text-[#11141A] dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
