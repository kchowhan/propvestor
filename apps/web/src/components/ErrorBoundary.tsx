import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
          <div className="max-w-md w-full">
            <h1 className="text-2xl font-semibold text-ink mb-4">Something went wrong</h1>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-slate-600 mb-2">Error details:</p>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">
                {this.state.error?.message || 'Unknown error'}
              </pre>
              <button
                className="mt-4 bg-ink text-white px-4 py-2 rounded-lg"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

