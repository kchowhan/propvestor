'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { format } from 'date-fns';
import { HomeownerPortalHeader } from '@/components/HomeownerPortalHeader';

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

function PaymentForm({ feeId, fee }: { feeId: string; fee: any }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { token } = useHomeownerAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');

  // Get existing payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['homeowner-payment-methods'],
    queryFn: () => apiFetch('/homeowner-payment-methods', { token }),
    enabled: Boolean(token),
  });

  const paymentMethods = paymentMethodsData?.data || [];

  // Create setup intent for new payment method
  const createSetupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch('/homeowner-payment-methods/setup-intent', {
        token,
        method: 'POST',
      });
      return response;
    },
  });

  // Attach payment method
  const attachPaymentMethodMutation = useMutation({
    mutationFn: async (data: { setupIntentId: string; isDefault: boolean }) => {
      return apiFetch('/homeowner-payment-methods/attach', {
        token,
        method: 'POST',
        body: data,
      });
    },
  });

  // Process payment
  const processPaymentMutation = useMutation({
    mutationFn: async (data: { hoaFeeId: string; paymentMethodId: string; amount?: number }) => {
      return apiFetch('/homeowner-payments/process', {
        token,
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeowner-fees'] });
      queryClient.invalidateQueries({ queryKey: ['homeowner-payments'] });
      queryClient.invalidateQueries({ queryKey: ['homeowner-dashboard'] });
      router.push('/homeowner/payments?success=true');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh the page.');
      return;
    }

    // If using existing payment method
    if (paymentMethodId && paymentMethodId !== 'new') {
      setIsProcessing(true);
      try {
        await processPaymentMutation.mutateAsync({
          hoaFeeId: feeId,
          paymentMethodId,
        });
      } catch (err: any) {
        setError(err.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
      return;
    }

    // If adding new payment method
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
      const attachResponse = await attachPaymentMethodMutation.mutateAsync({
        setupIntentId,
        isDefault: paymentMethods.length === 0,
      });

      const newPaymentMethodId = attachResponse.data.stripePaymentMethodId;

      // Process payment with new payment method
      await processPaymentMutation.mutateAsync({
        hoaFeeId: feeId,
        paymentMethodId: newPaymentMethodId,
      });
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const remainingAmount = Number(fee.amount) - Number(fee.paidAmount || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card">
        <div className="card-header">Payment Details</div>
        <div className="card-body">
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Fee:</span>
              <span className="font-semibold">{fee.description}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Due Date:</span>
              <span className="font-semibold">{format(new Date(fee.dueDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Total Amount:</span>
              <span className="font-semibold">${Number(fee.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Already Paid:</span>
              <span className="font-semibold text-green-600">${Number(fee.paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-lg font-semibold">Amount to Pay:</span>
              <span className="text-lg font-bold text-primary-600">${remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          {paymentMethods.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Payment Method
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
              >
                <option value="new">Add New Payment Method</option>
                {paymentMethods.map((pm: any) => (
                  <option key={pm.stripePaymentMethodId} value={pm.stripePaymentMethodId}>
                    {pm.cardBrand && `${pm.cardBrand} `}
                    {pm.last4 && `••••${pm.last4}`}
                    {pm.bankName && pm.bankName}
                    {pm.isDefault && ' (Default)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(!paymentMethodId || paymentMethodId === 'new') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {paymentMethods.length > 0 ? 'New Payment Method' : 'Payment Method'}
              </label>
              <div className="border border-slate-200 rounded-lg p-4">
                <PaymentElement />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isProcessing || !stripe || !elements}
            >
              {isProcessing ? 'Processing...' : `Pay $${remainingAmount.toFixed(2)}`}
            </button>
            <Link href="/homeowner/fees" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function PayFeePage() {
  const params = useParams();
  const feeId = params.feeId as string;
  const { token } = useHomeownerAuth();
  const router = useRouter();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Get fee details
  const { data: feeData, isLoading: feeLoading } = useQuery({
    queryKey: ['homeowner-fee', feeId],
    queryFn: () => apiFetch(`/homeowner-portal/fees?hoaFeeId=${feeId}`, { token }),
    enabled: Boolean(token && feeId),
  });

  const fee = feeData?.data?.[0];

  // Create setup intent for new payment method
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

  useEffect(() => {
    if (token && stripePromise) {
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
  }, [token, stripePromise]);

  if (feeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Fee not found.</div>
      </div>
    );
  }

  const remainingAmount = Number(fee.amount) - Number(fee.paidAmount || 0);

  if (remainingAmount <= 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HomeownerPortalHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink mb-2">Payment</h2>
            <Link href="/homeowner/fees" className="text-primary-600 hover:underline text-sm">
              ← Back to Fees
            </Link>
          </div>
          <div className="card">
            <div className="card-body text-center py-12">
              <p className="text-green-600 font-semibold mb-2">This fee has been fully paid.</p>
              <Link href="/homeowner/fees" className="btn btn-primary mt-4">
                Back to Fees
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeownerPortalHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-2">Pay HOA Fee</h2>
          <Link href="/homeowner/fees" className="text-primary-600 hover:underline text-sm">
            ← Back to Fees
          </Link>
        </div>
        {stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm feeId={feeId} fee={fee} />
          </Elements>
        ) : (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="spinner"></div>
              <p className="text-slate-600 mt-4">Loading payment form...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

