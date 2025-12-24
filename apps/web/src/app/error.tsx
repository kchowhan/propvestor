'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-ink mb-4">Something went wrong</h1>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-soft">
          <p className="text-slate-600 mb-4">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error.message && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Error details:</p>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto border border-slate-200">
                {error.message}
              </pre>
            </div>
          )}
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1"
              onClick={() => reset()}
            >
              Try Again
            </button>
            <button
              className="btn btn-secondary flex-1"
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

