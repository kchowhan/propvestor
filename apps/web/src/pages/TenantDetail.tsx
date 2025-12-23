import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AddPaymentMethodModal } from '../components/AddPaymentMethodModal';

export const TenantDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'leases' | 'screening' | 'payments'>('details');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => apiFetch(`/tenants/${id}`, { token }),
    enabled: Boolean(id),
  });

  const { data: screeningRequests } = useQuery({
    queryKey: ['screening-requests', id],
    queryFn: () => apiFetch(`/screening?tenantId=${id}`, { token }),
    enabled: Boolean(id) && activeTab === 'screening',
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', id],
    queryFn: () => apiFetch(`/payment-methods/tenant/${id}`, { token }),
    enabled: Boolean(id) && activeTab === 'payments',
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiFetch(`/payments?tenantId=${id}`, { token }),
    enabled: Boolean(id) && activeTab === 'payments',
  });

  const requestScreening = useMutation({
    mutationFn: (payload: { propertyId?: string; unitId?: string; rentAmount?: number }) =>
      apiFetch('/screening/request', {
        token,
        method: 'POST',
        body: { tenantId: id, ...payload },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-requests', id] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });

  const sendAdverseAction = useMutation({
    mutationFn: (screeningId: string) =>
      apiFetch(`/screening/${screeningId}/adverse-action`, {
        token,
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-requests', id] });
    },
  });

  if (isLoading) {
    return <div>Loading tenant...</div>;
  }

  if (error || !data) {
    return <div className="text-red-600">Failed to load tenant.</div>;
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'leases', label: 'Leases' },
    { id: 'screening', label: 'Screening' },
    { id: 'payments', label: 'Payments' },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Tenant</div>
        <div className="card-body">
          <div className="text-lg font-semibold">{data.firstName} {data.lastName}</div>
          <div className="text-sm text-slate-600">{data.email ?? 'No email on file'}</div>
          <div className="text-sm text-slate-600">{data.phone ?? 'No phone on file'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-slate-200">
          <div className="flex gap-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-ink text-ink'
                    : 'border-transparent text-slate-600 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Email</div>
                <div className="text-slate-600">{data.email ?? 'No email on file'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Phone</div>
                <div className="text-slate-600">{data.phone ?? 'No phone on file'}</div>
              </div>
              {data.notes && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Notes</div>
                  <div className="text-slate-600">{data.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Leases Tab */}
          {activeTab === 'leases' && (
            <div>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="pb-2">Property</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leases?.length > 0 ? (
                    data.leases.map((lt: any) => (
                      <tr key={lt.leaseId} className="border-t border-slate-100">
                        <td className="py-2">{lt.lease?.unit?.property?.name ?? '-'}</td>
                        <td className="py-2">{lt.lease?.unit?.name ?? '-'}</td>
                        <td className="py-2">{lt.lease?.status ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-600">
                        No leases found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Screening Tab */}
          {activeTab === 'screening' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700">Screening Requests</h3>
                <button
                  onClick={() => requestScreening.mutate({})}
                  disabled={requestScreening.isPending}
                  className="rounded-lg bg-ink text-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {requestScreening.isPending ? 'Requesting...' : 'Request Screening'}
                </button>
              </div>

              {screeningRequests?.length > 0 ? (
                <div className="space-y-4">
                  {screeningRequests.map((request: any) => (
                    <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            Status: <span className="capitalize">{request.status}</span>
                          </div>
                          {request.recommendation && (
                            <div className="text-sm text-slate-600 mt-1">
                              Recommendation: <span className="capitalize font-medium">{request.recommendation}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        {request.creditScore !== null && request.creditScore !== undefined && (
                          <div>
                            <div className="text-xs text-slate-500">Credit Score</div>
                            <div className="font-medium">{request.creditScore}</div>
                          </div>
                        )}
                        {request.incomeVerified !== null && (
                          <div>
                            <div className="text-xs text-slate-500">Income Verified</div>
                            <div className="font-medium">{request.incomeVerified ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                        {request.evictionHistory !== null && (
                          <div>
                            <div className="text-xs text-slate-500">Eviction History</div>
                            <div className="font-medium">{request.evictionHistory ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                        {request.criminalHistory !== null && (
                          <div>
                            <div className="text-xs text-slate-500">Criminal History</div>
                            <div className="font-medium">{request.criminalHistory ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                      </div>

                      {/* Flags/Warnings */}
                      {request.flags && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-500 mb-1">Flags</div>
                          <div className="text-sm text-amber-600">
                            {JSON.parse(request.flags).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {request.applicationUrl && (
                          <a
                            href={request.applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-ink underline"
                          >
                            View Application Link
                          </a>
                        )}
                        {request.reportPdfUrl && (
                          <a
                            href={request.reportPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-ink underline"
                          >
                            View Full Report PDF
                          </a>
                        )}
                        {request.recommendation === 'DECLINED' && !request.adverseActionSent && (
                          <button
                            onClick={() => sendAdverseAction.mutate(request.id)}
                            disabled={sendAdverseAction.isPending}
                            className="text-sm text-red-600 underline disabled:opacity-50"
                          >
                            {sendAdverseAction.isPending ? 'Sending...' : 'Send Adverse Action Notice'}
                          </button>
                        )}
                        {request.adverseActionSent && (
                          <span className="text-xs text-slate-500">
                            Adverse action sent {request.adverseActionSentAt ? new Date(request.adverseActionSentAt).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-600 py-8">
                  No screening requests found. Click "Request Screening" to start.
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Methods Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Payment Methods</h3>
                  <button
                    onClick={() => setShowAddPaymentMethod(true)}
                    className="text-sm bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink/90"
                  >
                    + Add Payment Method
                  </button>
                </div>
                {paymentMethods?.length > 0 ? (
                  <div className="space-y-2">
                    {paymentMethods.map((method: any) => (
                      <div key={method.id} className="border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-900">
                            {method.type === 'us_bank_account' || method.type === 'ach_debit' ? 'Bank Account' : 'Card'}
                            {method.isDefault && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Default</span>}
                          </div>
                          {method.type === 'us_bank_account' || method.type === 'ach_debit' ? (
                            <div className="text-sm text-slate-600">
                              {method.bankName} ••••{method.last4}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-600">
                              {method.cardBrand?.toUpperCase()} ••••{method.last4} 
                              {method.cardExpMonth && method.cardExpYear && ` Exp ${method.cardExpMonth}/${method.cardExpYear}`}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {method.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-600 py-4 border border-slate-200 rounded-lg">
                    No payment methods on file. Click "Add Payment Method" to add ACH or card.
                  </div>
                )}
              </div>

              {/* Payment History Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h3>
                {payments?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Method</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment: any) => (
                        <tr key={payment.id} className="border-t border-slate-100">
                          <td className="py-2">{new Date(payment.receivedDate).toLocaleDateString()}</td>
                          <td className="py-2">${Number(payment.amount).toFixed(2)}</td>
                          <td className="py-2">
                            {payment.method}
                            {payment.stripePaymentMethodId && (
                              <div className="text-xs text-slate-500">Stripe: {payment.stripePaymentMethodId.substring(0, 12)}...</div>
                            )}
                          </td>
                          <td className="py-2">
                            {payment.stripePaymentIntentId ? (
                              <a
                                href={`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ink underline text-xs"
                              >
                                View in Stripe
                              </a>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 text-slate-600">{payment.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-slate-600 py-4 border border-slate-200 rounded-lg">
                    No payment history found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Add Payment Method Modal */}
      {id && (
        <AddPaymentMethodModal
          tenantId={id}
          isOpen={showAddPaymentMethod}
          onClose={() => setShowAddPaymentMethod(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods', id] });
            setShowAddPaymentMethod(false);
          }}
        />
      )}
    </div>
  );
};
