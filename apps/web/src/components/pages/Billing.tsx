'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PaginationControls } from '../PaginationControls';

export const BillingPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'rent-roll' | 'payments' | 'reconciliation' | 'organization-fees'>('rent-roll');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rentRollPage, setRentRollPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [reconciliationsPage, setReconciliationsPage] = useState(1);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const listLimit = 20;

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    chargeId: '',
    amount: '',
    receivedDate: new Date().toISOString().split('T')[0],
    method: 'CHECK',
    checkNumber: '',
    createBankTransaction: true,
  });

  // Reconciliation form state
  const [reconciliationForm, setReconciliationForm] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  // Bank transaction import form
  const [bankTxForm, setBankTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    reference: '',
  });

  const rentRollQuery = useQuery({
    queryKey: ['rent-roll', month, year, rentRollPage],
    queryFn: () =>
      apiFetch(
        `/reports/rent-roll?month=${month}&year=${year}&limit=${listLimit}&offset=${(rentRollPage - 1) * listLimit}`,
        { token }
      ),
  });

  const chargesQuery = useQuery({
    queryKey: ['charges'],
    queryFn: () => apiFetch('/charges?limit=100&offset=0', { token }),
    enabled: activeTab === 'payments',
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', paymentsPage],
    queryFn: () =>
      apiFetch(`/payments?limit=${listLimit}&offset=${(paymentsPage - 1) * listLimit}`, { token }),
    enabled: activeTab === 'payments' || activeTab === 'reconciliation',
  });

  const reconciliationsQuery = useQuery({
    queryKey: ['reconciliations', reconciliationsPage],
    queryFn: () =>
      apiFetch(`/reconciliation?limit=${listLimit}&offset=${(reconciliationsPage - 1) * listLimit}`, { token }),
    enabled: activeTab === 'reconciliation',
  });

  const unmatchedQuery = useQuery({
    queryKey: ['unmatched', reconciliationForm.startDate, reconciliationForm.endDate, unmatchedPage],
    queryFn: () =>
      apiFetch(
        `/reconciliation/unmatched/list?startDate=${reconciliationForm.startDate}&endDate=${reconciliationForm.endDate}&limit=${listLimit}&offset=${(unmatchedPage - 1) * listLimit}`,
        { token }
      ),
    enabled: activeTab === 'reconciliation',
  });

  const organizationFeesQuery = useQuery({
    queryKey: ['organization-fees'],
    queryFn: () => apiFetch('/organization-fees', { token }),
    enabled: activeTab === 'organization-fees',
  });

  const generateMonthly = useMutation({
    mutationFn: () =>
      apiFetch('/billing/generate-monthly-rent', {
        token,
        method: 'POST',
        body: { month: Number(month), year: Number(year) },
      }),
    onSuccess: () => rentRollQuery.refetch(),
  });

  const createPayment = useMutation({
    mutationFn: () =>
      apiFetch('/payments', {
        token,
        method: 'POST',
        body: {
          chargeId: paymentForm.chargeId || null,
          amount: Number(paymentForm.amount),
          receivedDate: paymentForm.receivedDate,
          method: paymentForm.method,
          checkNumber: paymentForm.checkNumber || null,
          reference: paymentForm.checkNumber || null,
          createBankTransaction: paymentForm.createBankTransaction,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['rent-roll'] });
      setPaymentForm({
        chargeId: '',
        amount: '',
        receivedDate: new Date().toISOString().split('T')[0],
        method: 'CHECK',
        checkNumber: '',
        createBankTransaction: true,
      });
    },
  });

  const importBankTransaction = useMutation({
    mutationFn: () =>
      apiFetch('/reconciliation/import-transactions', {
        token,
        method: 'POST',
        body: {
          transactions: [
            {
              date: bankTxForm.date,
              amount: Number(bankTxForm.amount),
              description: bankTxForm.description,
              reference: bankTxForm.reference || null,
            },
          ],
          importSource: 'manual',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      setBankTxForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        reference: '',
      });
    },
  });

  const createReconciliation = useMutation({
    mutationFn: () =>
      apiFetch('/reconciliation', {
        token,
        method: 'POST',
        body: {
          startDate: reconciliationForm.startDate,
          endDate: reconciliationForm.endDate,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched'] });
    },
  });

  const _manualMatch = useMutation({
    mutationFn: ({ reconciliationId, paymentId, bankTransactionId }: any) =>
      apiFetch(`/reconciliation/${reconciliationId}/match`, {
        token,
        method: 'POST',
        body: { paymentId, bankTransactionId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const completeReconciliation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiFetch(`/reconciliation/${id}/complete`, {
        token,
        method: 'PUT',
        body: { notes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('rent-roll')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rent-roll'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Rent Roll
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reconciliation'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('organization-fees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'organization-fees'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Organization Fees
          </button>
        </nav>
      </div>

      {/* Rent Roll Tab */}
      {activeTab === 'rent-roll' && (
        <div className="card">
          <div className="card-header">Rent Roll</div>
          <div className="card-body">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="Month"
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year"
              />
              <button
                className="rounded-lg bg-ink text-white px-3 py-2 hover:bg-ink/90"
                onClick={() => generateMonthly.mutate()}
                disabled={generateMonthly.isPending}
              >
                Generate monthly rent
              </button>
            </div>

            {rentRollQuery.isLoading ? (
              <div>Loading rent roll...</div>
            ) : rentRollQuery.error ? (
              <div className="text-red-600">Failed to load rent roll.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="pb-2">Property</th>
                      <th className="pb-2">Unit</th>
                      <th className="pb-2">Tenants</th>
                      <th className="pb-2">Rent</th>
                      <th className="pb-2">Paid</th>
                      <th className="pb-2">Balance</th>
                    </tr>
                  </thead>
                    <tbody>
                    {rentRollQuery.data?.data && rentRollQuery.data.data.length > 0 ? (
                      rentRollQuery.data.data.map((row: any) => (
                        <tr key={row.chargeId} className="border-t border-slate-100">
                          <td className="py-2">{row.property?.name ?? '-'}</td>
                          <td className="py-2">{row.unit?.name ?? '-'}</td>
                          <td className="py-2">
                            {row.tenants?.map((tenant: any) => tenant.firstName).join(', ') || '-'}
                          </td>
                          <td className="py-2">${(row.rentAmount ?? 0).toFixed(2)}</td>
                          <td className="py-2">${(row.amountPaid ?? 0).toFixed(2)}</td>
                          <td className="py-2">${(row.balance ?? 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-600">
                          No rent charges found for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <PaginationControls
                  pagination={rentRollQuery.data?.pagination}
                  page={rentRollPage}
                  limit={listLimit}
                  onPageChange={setRentRollPage}
                  label="rent charges"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Record Payment Form */}
          <div className="card">
            <div className="card-header">Record Payment (Check/Cash/Manual)</div>
            <div className="card-body">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createPayment.mutate();
                }}
              >
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Charge (Optional)</label>
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={paymentForm.chargeId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, chargeId: e.target.value }))}
                  >
                    <option value="">Select charge (optional)</option>
                    {chargesQuery.data?.data
                      ?.filter((c: any) => c.status !== 'PAID' && c.status !== 'CANCELLED')
                      .map((charge: any) => (
                        <option key={charge.id} value={charge.id}>
                          {charge.description} - ${Number(charge.amount).toFixed(2)} (Due: {new Date(charge.dueDate).toLocaleDateString()})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Received Date *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="date"
                    value={paymentForm.receivedDate}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, receivedDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    required
                  >
                    <option value="CHECK">Check</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MANUAL">Manual Entry</option>
                  </select>
                </div>
                {paymentForm.method === 'CHECK' && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-slate-700 mb-1">Check Number</label>
                      <input
                        className="rounded-lg border border-slate-200 px-3 py-2"
                        type="text"
                        value={paymentForm.checkNumber}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, checkNumber: e.target.value }))}
                        placeholder="1234"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-slate-700 mb-1">Bank Transaction</label>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="createBankTx"
                          className="mt-1"
                          checked={paymentForm.createBankTransaction}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, createBankTransaction: e.target.checked }))
                          }
                        />
                        <div className="flex-1">
                          <label htmlFor="createBankTx" className="text-sm text-slate-700 cursor-pointer">
                            Create bank transaction record
                          </label>
                          <p className="text-xs text-slate-500 mt-1">
                            Creates a bank transaction when check is received (before it clears)
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90"
                    disabled={createPayment.isPending}
                  >
                    {createPayment.isPending ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Payments List */}
          <div className="card">
            <div className="card-header">All Payments</div>
            <div className="card-body">
                    {paymentsQuery.isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading payments...</div>
              ) : paymentsQuery.data?.data?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No payments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Method</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Reference</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Charge</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Reconciled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsQuery.data?.data?.map((payment: any) => (
                        <tr key={payment.id} className="border-b border-slate-100">
                          <td className="py-3 px-4">{new Date(payment.receivedDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-medium">${Number(payment.amount).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {payment.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{payment.reference || '-'}</td>
                          <td className="py-3 px-4 text-slate-600">{payment.charge?.description || '-'}</td>
                          <td className="py-3 px-4">
                            {payment.reconciled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✓ Reconciled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationControls
                pagination={paymentsQuery.data?.pagination}
                page={paymentsPage}
                limit={listLimit}
                onPageChange={setPaymentsPage}
                label="payments"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Tab */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Import Bank Transaction */}
          <div className="card">
            <div className="card-header">Import Bank Transaction</div>
            <div className="card-body">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  importBankTransaction.mutate();
                }}
              >
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="date"
                    value={bankTxForm.date}
                    onChange={(e) => setBankTxForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={bankTxForm.amount}
                    onChange={(e) => setBankTxForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="text"
                    value={bankTxForm.description}
                    onChange={(e) => setBankTxForm((prev) => ({ ...prev, description: e.target.value }))}
                    required
                    placeholder="Check payment #1234"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Reference (Check #, Transaction ID)</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="text"
                    value={bankTxForm.reference}
                    onChange={(e) => setBankTxForm((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="1234"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90"
                    disabled={importBankTransaction.isPending}
                  >
                    {importBankTransaction.isPending ? 'Importing...' : 'Import Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Create Reconciliation */}
          <div className="card">
            <div className="card-header">Create Reconciliation Period</div>
            <div className="card-body">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createReconciliation.mutate();
                }}
              >
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="date"
                    value={reconciliationForm.startDate}
                    onChange={(e) => setReconciliationForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    type="date"
                    value={reconciliationForm.endDate}
                    onChange={(e) => setReconciliationForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90"
                    disabled={createReconciliation.isPending}
                  >
                    {createReconciliation.isPending ? 'Creating...' : 'Create Reconciliation'}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    This will automatically match payments with bank transactions for the selected period.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Unmatched Items */}
          <div className="card">
            <div className="card-header">Unmatched Items</div>
            <div className="card-body">
              {unmatchedQuery.isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading unmatched items...</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Unmatched Payments ({unmatchedQuery.data?.data?.unmatchedPayments?.length || 0})
                    </h3>
                    {unmatchedQuery.data?.data?.unmatchedPayments?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">Amount</th>
                              <th className="text-left py-2 px-3">Method</th>
                              <th className="text-left py-2 px-3">Reference</th>
                              <th className="text-left py-2 px-3">Charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatchedQuery.data?.data?.unmatchedPayments?.map((payment: any) => (
                              <tr key={payment.id} className="border-b border-slate-100">
                                <td className="py-2 px-3">{new Date(payment.receivedDate).toLocaleDateString()}</td>
                                <td className="py-2 px-3 font-medium">${Number(payment.amount).toFixed(2)}</td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    {payment.method}
                                  </span>
                                </td>
                                <td className="py-2 px-3">{payment.reference || '-'}</td>
                                <td className="py-2 px-3 text-slate-600">{payment.charge?.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">All payments are matched.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Unmatched Bank Transactions ({unmatchedQuery.data?.data?.unmatchedTransactions?.length || 0})
                    </h3>
                    {unmatchedQuery.data?.data?.unmatchedTransactions?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">Amount</th>
                              <th className="text-left py-2 px-3">Description</th>
                              <th className="text-left py-2 px-3">Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatchedQuery.data?.data?.unmatchedTransactions?.map((tx: any) => (
                              <tr key={tx.id} className="border-b border-slate-100">
                                <td className="py-2 px-3">{new Date(tx.date).toLocaleDateString()}</td>
                                <td className="py-2 px-3 font-medium">${Number(tx.amount).toFixed(2)}</td>
                                <td className="py-2 px-3">{tx.description}</td>
                                <td className="py-2 px-3">{tx.reference || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">All transactions are matched.</p>
                    )}
                  </div>

                  {unmatchedQuery.data?.data?.unmatchedPayments?.length > 0 &&
                    unmatchedQuery.data?.data?.unmatchedTransactions?.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Tip:</strong> Create a reconciliation period above to automatically match payments with
                          bank transactions. The system will match items with the same amount within 3 days.
                        </p>
                      </div>
                    )}
                </div>
              )}
              <PaginationControls
                pagination={unmatchedQuery.data?.pagination?.unmatchedPayments}
                page={unmatchedPage}
                limit={listLimit}
                onPageChange={setUnmatchedPage}
                label="unmatched items"
              />
            </div>
          </div>

          {/* Reconciliation History */}
          <div className="card">
            <div className="card-header">Reconciliation History</div>
            <div className="card-body">
              {reconciliationsQuery.isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading reconciliations...</div>
              ) : reconciliationsQuery.data?.data?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No reconciliations yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Period</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Expected</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Actual</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Difference</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationsQuery.data?.data?.map((recon: any) => (
                        <tr key={recon.id} className="border-b border-slate-100">
                          <td className="py-3 px-4">
                            {new Date(recon.startDate).toLocaleDateString()} - {new Date(recon.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">${Number(recon.expectedTotal || 0).toFixed(2)}</td>
                          <td className="py-3 px-4">${Number(recon.actualTotal || 0).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className={Number(recon.difference || 0) === 0 ? 'text-green-600' : 'text-red-600'}>
                              ${Number(recon.difference || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                recon.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : recon.status === 'IN_PROGRESS'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {recon.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {recon.status !== 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  if (confirm('Mark this reconciliation as completed?')) {
                                    completeReconciliation.mutate({ id: recon.id });
                                  }
                                }}
                                className="text-ink hover:text-ink/80 text-sm font-medium"
                              >
                                Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationControls
                pagination={reconciliationsQuery.data?.pagination}
                page={reconciliationsPage}
                limit={listLimit}
                onPageChange={setReconciliationsPage}
                label="reconciliations"
              />
            </div>
          </div>
        </div>
      )}

      {/* Organization Fees Tab */}
      {activeTab === 'organization-fees' && (
        <div className="card">
          <div className="card-header">Organization Fees</div>
          <div className="card-body">
            <p className="text-sm text-slate-600 mb-4">
              Fees that your organization is responsible for paying, including RentSpree screening fees and Stripe processing fees.
            </p>

            {organizationFeesQuery.isLoading ? (
              <div>Loading organization fees...</div>
            ) : organizationFeesQuery.error ? (
              <div className="text-red-600">Failed to load organization fees.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizationFeesQuery.data?.data && organizationFeesQuery.data.data.length > 0 ? (
                      organizationFeesQuery.data.data.map((fee: any) => (
                        <tr key={fee.id} className="border-t border-slate-100">
                          <td className="py-2">
                            {new Date(fee.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                fee.feeType === 'RENTSPREE_SCREENING'
                                  ? 'bg-blue-100 text-blue-700'
                                  : fee.feeType === 'STRIPE_PROCESSING'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {fee.feeType === 'RENTSPREE_SCREENING' ? 'RentSpree Screening' : 'Stripe Processing'}
                            </span>
                          </td>
                          <td className="py-2">{fee.description}</td>
                          <td className="py-2 font-medium">${Number(fee.amount).toFixed(2)}</td>
                          <td className="py-2">
                            {fee.charge ? (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  fee.charge.status === 'PAID'
                                    ? 'bg-green-100 text-green-700'
                                    : fee.charge.status === 'PARTIALLY_PAID'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {fee.charge.status}
                              </span>
                            ) : (
                              <span className="text-slate-400">No charge created</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-600">
                          No organization fees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {organizationFeesQuery.data?.data && organizationFeesQuery.data.data.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-slate-600">Total Fees (All Time)</div>
                    <div className="text-2xl font-bold text-ink mt-1">
                      $
                      {organizationFeesQuery.data.data
                        .reduce((sum: number, fee: any) => sum + Number(fee.amount), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Unpaid Fees</div>
                    <div className="text-xl font-semibold text-red-600 mt-1">
                      $
                      {organizationFeesQuery.data.data
                        .filter((fee: any) => fee.charge && fee.charge.status !== 'PAID')
                        .reduce((sum: number, fee: any) => sum + Number(fee.amount), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
