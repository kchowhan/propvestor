'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { useEffect } from 'react';

// Initialize Stripe
let stripePromise: Promise<any> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    stripePromise = apiFetch('/homeowner-payment-methods/publishable-key')
      .then((data: any) => {
        const publishableKey = data?.data?.publishableKey || data?.publishableKey;
        if (!publishableKey) {
          throw new Error('Stripe publishable key not found');
        }
        return loadStripe(publishableKey);
      })
      .catch((err) => {
        console.error('Failed to load Stripe:', err);
        throw err;
      });
  }
  return stripePromise;
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useHomeownerAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  const createSetupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch('/homeowner-payment-methods/setup-intent', {
        token,
        method: 'POST',
      });
      return response;
    },
  });

  const attachPaymentMethodMutation = useMutation({
    mutationFn: async (data: { setupIntentId: string; isDefault: boolean }) => {
      return apiFetch('/homeowner-payment-methods/attach', {
        token,
        method: 'POST',
        body: data,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh the page.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create setup intent
      const setupIntentResponse = await createSetupIntentMutation.mutateAsync();
      const { clientSecret, setupIntentId } = setupIntentResponse.data;

      // Confirm setup
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Failed to add payment method.');
        setIsProcessing(false);
        return;
      }

      // Attach payment method
      await attachPaymentMethodMutation.mutateAsync({
        setupIntentId,
        isDefault,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-slate-200 rounded-lg p-4">
        <PaymentElement />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="isDefault" className="ml-2 text-sm text-slate-700">
          Set as default payment method
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? 'Adding...' : 'Add Payment Method'}
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="btn btn-secondary"
          disabled={isProcessing}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { token } = useHomeownerAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homeowner-payment-methods'],
    queryFn: () => apiFetch('/homeowner-payment-methods', { token }),
    enabled: Boolean(token),
  });

  // Initialize Stripe
  useEffect(() => {
    if (token && !stripePromise) {
      getStripePromise()
        .then((stripe) => {
          setStripePromise(Promise.resolve(stripe));
        })
        .catch((err) => {
          console.error('Failed to initialize Stripe:', err);
        });
    }
  }, [token, stripePromise]);

  // Create setup intent when showing add form
  useEffect(() => {
    if (showAddForm && token && stripePromise && !clientSecret) {
      apiFetch('/homeowner-payment-methods/setup-intent', {
        token,
        method: 'POST',
      })
        .then((response: any) => {
          setClientSecret(response.data.clientSecret);
        })
        .catch((err) => {
          console.error('Failed to create setup intent:', err);
        });
    }
  }, [showAddForm, token, stripePromise, clientSecret]);

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return apiFetch(`/homeowner-payment-methods/${paymentMethodId}`, {
        token,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeowner-payment-methods'] });
    },
  });

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await deletePaymentMethodMutation.mutateAsync(paymentMethodId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment method.');
    }
  };

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
        <div className="text-red-600">Failed to load payment methods.</div>
      </div>
    );
  }

  const paymentMethods = data?.data || [];

  const options: StripeElementsOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-ink">Payment Methods</h1>
            </div>
            {!showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setClientSecret(null); // Reset to create new setup intent
                }}
                className="btn btn-primary"
              >
                Add Payment Method
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAddForm ? (
          <div className="card">
            <div className="card-header">Add Payment Method</div>
            <div className="card-body">
              {stripePromise && clientSecret && options ? (
                <Elements stripe={stripePromise} options={options}>
                  <AddPaymentMethodForm
                    onSuccess={() => {
                      setShowAddForm(false);
                      setClientSecret(null);
                      refetch();
                    }}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <div className="spinner"></div>
                  <p className="text-slate-600 mt-4">Loading payment form...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {paymentMethods.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-12">
                  <p className="text-slate-600 mb-4">No payment methods found.</p>
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setClientSecret(null);
                    }}
                    className="btn btn-primary"
                  >
                    Add Payment Method
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">Your Payment Methods</div>
                <div className="card-body">
                  <div className="space-y-4">
                    {paymentMethods.map((pm: any) => (
                      <div
                        key={pm.stripePaymentMethodId}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-medium">
                              {pm.cardBrand && `${pm.cardBrand} `}
                              {pm.last4 && `••••${pm.last4}`}
                              {pm.bankName && pm.bankName}
                              {!pm.cardBrand && !pm.bankName && 'Payment Method'}
                            </div>
                            <div className="text-sm text-slate-600">
                              {pm.type === 'card' && pm.cardExpMonth && pm.cardExpYear
                                ? `Expires ${pm.cardExpMonth}/${pm.cardExpYear}`
                                : pm.type}
                            </div>
                          </div>
                          {pm.isDefault && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(pm.stripePaymentMethodId)}
                          className="btn btn-sm btn-secondary"
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          {deletePaymentMethodMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

