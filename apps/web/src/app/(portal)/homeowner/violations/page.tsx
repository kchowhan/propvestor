'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { HomeownerPortalHeader } from '@/components/HomeownerPortalHeader';

export default function HomeownerViolationsPage() {
  const { token } = useHomeownerAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-violations'],
    queryFn: () => apiFetch('/violations?homeownerId=current', { token }),
    enabled: Boolean(token),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
        <p className="text-slate-600 mt-4">Loading violations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Failed to load violations.</div>
      </div>
    );
  }

  const violations = data?.data || [];

  const severityColors: Record<string, string> = {
    MINOR: 'bg-yellow-100 text-yellow-800',
    MODERATE: 'bg-orange-100 text-orange-800',
    MAJOR: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-200 text-red-900',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    RESOLVED: 'bg-green-100 text-green-800',
    APPEALED: 'bg-yellow-100 text-yellow-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeownerPortalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {violations.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-ink mb-2">No Violations</h3>
              <p className="text-slate-600">You have no active violations on record.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {violations.map((violation: any) => (
              <div key={violation.id} className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{violation.type}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Issued: {new Date(violation.violationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[violation.severity] || 'bg-slate-100 text-slate-800'}`}>
                      {violation.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[violation.status] || 'bg-slate-100 text-slate-800'}`}>
                      {violation.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-4">
                    <label className="text-sm font-medium text-slate-600">Description</label>
                    <p className="text-ink mt-1 whitespace-pre-wrap">{violation.description}</p>
                  </div>

                  {/* Property/Unit Info */}
                  {(violation.unit || violation.property) && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-slate-600">Property</label>
                      <p className="text-ink mt-1">
                        {violation.unit
                          ? `${violation.unit.property.name} - Unit ${violation.unit.name}`
                          : violation.property.name}
                      </p>
                    </div>
                  )}

                  {/* Documents/Photos */}
                  {violation.documents && violation.documents.length > 0 && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-slate-600 mb-2 block">Attachments</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {violation.documents.map((doc: any) => (
                          <div key={doc.id} className="border border-slate-200 rounded-lg p-3 hover:border-primary-300 transition-colors">
                            <div className="text-sm font-medium text-ink truncate">{doc.fileName}</div>
                            <div className="text-xs text-slate-500 mt-1">{doc.fileType}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Letters Sent */}
                  {violation.letters && violation.letters.length > 0 && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <label className="text-sm font-medium text-slate-600 mb-2 block">Letters Sent</label>
                      <div className="space-y-2">
                        {violation.letters.map((letter: any) => (
                          <div key={letter.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-ink">{letter.subject}</div>
                                <div className="text-sm text-slate-600">
                                  {letter.letterType.replace('_', ' ')} •{' '}
                                  {letter.sentDate ? new Date(letter.sentDate).toLocaleDateString() : 'Draft'}
                                </div>
                              </div>
                              {letter.pdfUrl && (
                                <a
                                  href={letter.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                >
                                  View PDF
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved Date */}
                  {violation.resolvedDate && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Resolved:</span>{' '}
                        {new Date(violation.resolvedDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

