'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomeownerDocumentsPage() {
  const { token, logout } = useHomeownerAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-documents'],
    queryFn: () => apiFetch('/homeowner-portal/documents', { token }),
    enabled: Boolean(token),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Failed to load documents.</div>
      </div>
    );
  }

  const documents = data?.data || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-ink">Documents</h1>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/homeowner/login');
              }}
              className="btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="card-header">Association Documents</div>
          <div className="card-body">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600">No documents available at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 font-semibold">
                          {doc.fileType?.includes('pdf') ? 'PDF' : 'DOC'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-ink">{doc.fileName}</h3>
                        <p className="text-sm text-slate-600">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                          {doc.uploadedBy && ` by ${doc.uploadedBy.name}`}
                        </p>
                      </div>
                    </div>
                    <button className="btn btn-secondary text-sm" disabled>
                      View
                      <span className="text-xs text-slate-500 ml-2">(Coming Soon)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

