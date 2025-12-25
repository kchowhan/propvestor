'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Error is available but not displayed in this simple error boundary
  void error;
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
          <div className="max-w-md w-full">
            <h1 className="text-2xl font-semibold text-ink mb-4">Something went wrong</h1>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-soft">
              <p className="text-slate-600 mb-4">
                A critical error occurred. Please refresh the page or contact support.
              </p>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 bg-ink text-white rounded-lg hover:bg-ink/90 transition-colors"
                  onClick={() => reset()}
                >
                  Try Again
                </button>
                <button
                  className="px-4 py-2 bg-white text-ink border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

