'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function PricingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Fetch available plans
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => apiFetch('/subscriptions/plans', { token }),
  });

  // Fetch current subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => apiFetch('/subscriptions/current', { token }),
  });

  const plans = plansData?.data || [];
  const subscription = subscriptionData?.data;
  const currentPlanId = subscription?.planId;

  // Subscribe mutation
  const subscribe = useMutation({
    mutationFn: (planId: string) =>
      apiFetch('/subscriptions/subscribe', {
        token,
        method: 'POST',
        body: { planId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'limits'] });
      // Redirect to subscription management page
      window.location.href = '/subscription';
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-ink mb-4">Choose Your Plan</h1>
        <p className="text-slate-600 text-lg">Select the plan that best fits your property management needs</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan: any, index: number) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isPopular = plan.slug === 'pro'; // Mark Pro as popular

          return (
            <div
              key={plan.id}
              className={`relative border rounded-lg p-8 ${
                isPopular
                  ? 'border-primary-500 shadow-xl scale-105 bg-gradient-to-b from-primary-50 to-white'
                  : 'border-slate-200 hover:shadow-lg'
              } transition-all`}
            >
              {isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-ink mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-ink">${Number(plan.price).toFixed(2)}</span>
                  <span className="text-slate-600">/{plan.billingInterval}</span>
                </div>
              </div>

              {/* Limits & Restrictions */}
              <div className="mb-6 border-b border-slate-200 pb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Resource Limits</h4>
                <ul className="space-y-2.5">
                  {Object.entries(plan.limits || {}).map(([key, value]: [string, any]) => {
                    const labelMap: Record<string, string> = {
                      properties: 'Properties',
                      tenants: 'Tenants',
                      users: 'Users',
                      storage: 'Storage',
                      apiCalls: 'API Calls',
                    };
                    const label = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    const displayValue = value === 999999 ? 'Unlimited' : value.toLocaleString();
                    const unit = key === 'storage' ? 'MB' : key === 'apiCalls' ? '/hour' : '';
                    return (
                      <li key={key} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-600 font-medium">{label}</span>
                        <span className="font-bold text-ink">
                          {displayValue}{unit && ` ${unit}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Features</h4>
                <ul className="space-y-2.5">
                  {Object.entries(plan.features || {}).map(([key, value]: [string, any]) => {
                    const featureMap: Record<string, string> = {
                      properties: 'Property Management',
                      tenants: 'Tenant Management',
                      leases: 'Lease Management',
                      workOrders: 'Work Orders',
                      reports: 'Basic Reports',
                      api: 'API Access',
                      advancedReports: 'Advanced Reports',
                      sso: 'Single Sign-On (SSO)',
                      whiteLabel: 'White Label',
                      dedicatedSupport: 'Dedicated Support',
                    };
                    const featureLabel = featureMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    return (
                      <li key={key} className="flex items-center gap-2.5 text-sm">
                        {value ? (
                          <>
                            <span className="text-green-600 font-bold text-base">✓</span>
                            <span className="text-slate-700">{featureLabel}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-300 font-bold text-base">✗</span>
                            <span className="text-slate-400 line-through">{featureLabel}</span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                onClick={() => subscribe.mutate(plan.id)}
                disabled={subscribe.isPending || isCurrentPlan}
                className={`w-full rounded-lg px-6 py-3 font-semibold transition-colors ${
                  isCurrentPlan
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : isPopular
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-ink text-white hover:bg-ink/90'
                } disabled:opacity-50`}
              >
                {isCurrentPlan
                  ? 'Current Plan'
                  : subscribe.isPending
                  ? 'Subscribing...'
                  : plan.price === 0
                  ? 'Get Started'
                  : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-center text-slate-600 mt-12">
        <p>All plans include a 14-day free trial. No credit card required.</p>
        <p className="mt-2">
          Already have a subscription?{' '}
          <a href="/subscription" className="text-ink hover:underline font-medium">
            Manage your subscription
          </a>
        </p>
      </div>
    </div>
  );
}

