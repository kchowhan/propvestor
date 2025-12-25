'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function ViolationLetterPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const violationId = params.id as string;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    letterType: 'FIRST_NOTICE' as 'FIRST_NOTICE' | 'SECOND_NOTICE' | 'FINAL_NOTICE' | 'HEARING_NOTICE' | 'CUSTOM',
    subject: '',
    content: '',
    notes: '',
  });

  const { data: violationResponse } = useQuery({
    queryKey: ['violation', violationId],
    queryFn: () => apiFetch(`/violations/${violationId}`, { token }),
  });

  const violation = violationResponse?.data;

  // Auto-populate subject and content based on letter type
  const updateLetterTemplate = (type: string) => {
    if (!violation) return;

    const homeownerName = `${violation.homeowner.firstName} ${violation.homeowner.lastName}`;
    const propertyInfo = violation.unit
      ? `${violation.unit.property.name} - Unit ${violation.unit.name}`
      : violation.property
      ? violation.property.name
      : '';

    const templates: Record<string, { subject: string; content: string }> = {
      FIRST_NOTICE: {
        subject: `First Notice of Violation - ${violation.type}`,
        content: `Dear ${homeownerName},

This letter serves as a FIRST NOTICE of violation of the association's governing documents.

VIOLATION DETAILS:
- Type: ${violation.type}
- Severity: ${violation.severity}
- Date: ${new Date(violation.violationDate).toLocaleDateString()}
${propertyInfo ? `- Property: ${propertyInfo}` : ''}

DESCRIPTION:
${violation.description}

You are required to correct this violation within 14 days from the date of this notice. Failure to comply may result in additional notices and potential fines.

If you have any questions or wish to discuss this matter, please contact the association management office.

Sincerely,
${violation.association.name} Management`,
      },
      SECOND_NOTICE: {
        subject: `Second Notice of Violation - ${violation.type}`,
        content: `Dear ${homeownerName},

This letter serves as a SECOND NOTICE of violation. Our records indicate that the violation described in our first notice has not been corrected.

VIOLATION DETAILS:
- Type: ${violation.type}
- Severity: ${violation.severity}
- Date: ${new Date(violation.violationDate).toLocaleDateString()}
${propertyInfo ? `- Property: ${propertyInfo}` : ''}

DESCRIPTION:
${violation.description}

You are required to correct this violation within 7 days from the date of this notice. Failure to comply will result in a final notice and may lead to fines and further action.

If you have any questions or wish to discuss this matter, please contact the association management office immediately.

Sincerely,
${violation.association.name} Management`,
      },
      FINAL_NOTICE: {
        subject: `Final Notice of Violation - ${violation.type}`,
        content: `Dear ${homeownerName},

This letter serves as a FINAL NOTICE of violation. Despite previous notices, the violation has not been corrected.

VIOLATION DETAILS:
- Type: ${violation.type}
- Severity: ${violation.severity}
- Date: ${new Date(violation.violationDate).toLocaleDateString()}
${propertyInfo ? `- Property: ${propertyInfo}` : ''}

DESCRIPTION:
${violation.description}

This is your final notice. You must correct this violation immediately. Failure to comply will result in fines and may lead to further legal action as permitted by the association's governing documents.

If you have any questions or wish to discuss this matter, please contact the association management office immediately.

Sincerely,
${violation.association.name} Management`,
      },
      HEARING_NOTICE: {
        subject: `Notice of Hearing - Violation: ${violation.type}`,
        content: `Dear ${homeownerName},

You are hereby notified that a hearing has been scheduled regarding the violation described below.

VIOLATION DETAILS:
- Type: ${violation.type}
- Severity: ${violation.severity}
- Date: ${new Date(violation.violationDate).toLocaleDateString()}
${propertyInfo ? `- Property: ${propertyInfo}` : ''}

DESCRIPTION:
${violation.description}

You have the right to attend this hearing and present your case. Please contact the association management office to schedule a hearing date and time.

Sincerely,
${violation.association.name} Management`,
      },
      CUSTOM: {
        subject: `Violation Notice - ${violation.type}`,
        content: `Dear ${homeownerName},

This letter is regarding a violation of the association's governing documents.

VIOLATION DETAILS:
- Type: ${violation.type}
- Severity: ${violation.severity}
- Date: ${new Date(violation.violationDate).toLocaleDateString()}
${propertyInfo ? `- Property: ${propertyInfo}` : ''}

DESCRIPTION:
${violation.description}

Please contact the association management office if you have any questions.

Sincerely,
${violation.association.name} Management`,
      },
    };

    const template = templates[type] || templates.CUSTOM;
    setForm({
      ...form,
      letterType: type as any,
      subject: template.subject,
      content: template.content,
    });
  };

  const createLetterMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch(`/violations/${violationId}/letters`, {
        token,
        method: 'POST',
        body: {
          violationId,
          ...payload,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation', violationId] });
      router.push(`/violations`);
    },
  });

  const sendLetterMutation = useMutation({
    mutationFn: ({ letterId, sendEmail }: { letterId: string; sendEmail: boolean }) =>
      apiFetch(`/violations/letters/${letterId}/send`, {
        token,
        method: 'POST',
        body: { letterId, sendEmail },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violation', violationId] });
      router.push(`/violations`);
    },
  });

  if (!violation) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Create Violation Letter</h1>
          <p className="text-slate-600 mt-1">
            Violation: {violation.type} • {violation.homeowner.firstName} {violation.homeowner.lastName}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-slate-600 hover:text-ink"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createLetterMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Letter Type *</label>
            <select
              required
              value={form.letterType}
              onChange={(e) => updateLetterTemplate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="FIRST_NOTICE">First Notice</option>
              <option value="SECOND_NOTICE">Second Notice</option>
              <option value="FINAL_NOTICE">Final Notice</option>
              <option value="HEARING_NOTICE">Hearing Notice</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={15}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              You can use plain text or HTML formatting. Line breaks will be preserved.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Internal notes (not included in letter)..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-slate-600 hover:text-ink border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLetterMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createLetterMutation.isPending ? 'Creating...' : 'Create Letter'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Letters */}
      {violation.letters && violation.letters.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h2 className="text-lg font-semibold text-ink mb-4">Existing Letters</h2>
          <div className="space-y-3">
            {violation.letters.map((letter: any) => (
              <div key={letter.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-ink">{letter.subject}</div>
                    <div className="text-sm text-slate-600">
                      {letter.letterType.replace('_', ' ')} •{' '}
                      {letter.sentDate ? `Sent ${new Date(letter.sentDate).toLocaleDateString()}` : 'Draft'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {letter.pdfUrl && (
                      <a
                        href={letter.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg"
                      >
                        View PDF
                      </a>
                    )}
                    {!letter.sentDate && (
                      <button
                        onClick={() => {
                          if (confirm('Send this letter via email and generate PDF?')) {
                            sendLetterMutation.mutate({ letterId: letter.id, sendEmail: true });
                          }
                        }}
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

