import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Initialize Stripe - get the publishable key from the API
const getStripePublishableKey = async (token: string | null): Promise<string> => {
  try {
    const response = await apiFetch('/payment-methods/publishable-key', { token });
    // Handle both response formats: { data: { publishableKey } } and { publishableKey }
    const key = response.data?.publishableKey || response.publishableKey;
    if (!key) {
      throw new Error('Stripe publishable key not found in API response');
    }
    return key;
  } catch (err: any) {
    console.error('Error fetching Stripe publishable key:', err);
    // Fallback to environment variable if API call fails (for Next.js)
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      // Extract error message from various possible formats
      let errorMessage = 'Stripe publishable key not configured';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      throw new Error(errorMessage);
    }
    return key;
  }
};

interface AddPaymentMethodModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentMethodFormProps {
  tenantId: string;
  setupIntentId: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

function PaymentMethodForm({ tenantId, setupIntentId, onSuccess, onClose }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements || !setupIntentId) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the setup intent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Failed to confirm payment method');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.status !== 'succeeded') {
        setError('Payment method setup was not completed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Attach the payment method
      await apiFetch('/payment-methods/attach', {
        token,
        method: 'POST',
        body: {
          tenantId,
          setupIntentId,
          isDefault,
        },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="isDefault" className="text-sm text-slate-700">
          Set as default payment method
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="btn btn-primary"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="spinner"></div>
              <span>Processing...</span>
            </span>
          ) : (
            'Add Payment Method'
          )}
        </button>
      </div>
    </form>
  );
}

export const AddPaymentMethodModal = ({ tenantId, isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) => {
  const { token } = useAuth();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStripePromise(null);
      setClientSecret(null);
      setSetupIntentId(null);
      setError(null);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Step 1: Load Stripe publishable key
        const key = await getStripePublishableKey(token);
        const stripePromiseValue = loadStripe(key);
        setStripePromise(stripePromiseValue);

        // Step 2: Create setup intent to get clientSecret
        const response = await apiFetch('/payment-methods/setup-intent', {
          token,
          method: 'POST',
          body: { tenantId },
        });
        
        setClientSecret(response.clientSecret);
        setSetupIntentId(response.setupIntentId);
      } catch (err: any) {
        console.error('Failed to initialize payment form:', err);
        // Extract error message from various possible formats
        let errorMessage = 'Failed to initialize payment form. Please check your configuration.';
        if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [isOpen, tenantId, token]);

  if (!isOpen) {
    return null;
  }

  if (isLoading || !stripePromise || !clientSecret) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-large p-6 max-w-md w-full mx-4 animate-slide-up">
          {error ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                <div className="font-semibold mb-1">Configuration Error</div>
                <div>{error}</div>
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                <p className="font-semibold mb-2 text-slate-700">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Add <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-mono">STRIPE_PUBLISHABLE_KEY</code> to your <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-mono">apps/api/.env</code> file</li>
                  <li>Restart your API server after adding the key</li>
                </ol>
              </div>
              <button
                onClick={onClose}
                className="btn btn-secondary w-full"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-4 w-8 h-8"></div>
              <div className="text-slate-600">Loading payment form...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-large p-6 max-w-md w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-ink">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentMethodForm tenantId={tenantId} setupIntentId={setupIntentId} onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
};

