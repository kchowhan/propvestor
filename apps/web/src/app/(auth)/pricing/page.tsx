'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function PricingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Fetch available plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => apiFetch('/subscriptions/plans', { token }),
  });

  // Fetch current subscription
  const { data: subscription } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => apiFetch('/subscriptions/current', { token }),
  });

  const plansList = plans || [];
  const currentPlanId = subscription?.planId;
  const currentPlan = plansList.find((p: any) => p.id === currentPlanId);

  // Define plan hierarchy for upgrade/downgrade detection
  const planHierarchy: Record<string, number> = {
    'free': 0,
    'basic': 1,
    'pro': 2,
    'enterprise': 3,
  };

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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ink mb-2">Choose Your Plan</h1>
        <p className="text-slate-600">Select the plan that best fits your property management needs</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {plansList.map((plan: any, index: number) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isPopular = plan.slug === 'pro'; // Mark Pro as popular
          
          // Determine if this is an upgrade or downgrade
          const currentPlanLevel = currentPlan ? planHierarchy[currentPlan.slug] ?? -1 : -1;
          const targetPlanLevel = planHierarchy[plan.slug] ?? -1;
          const isDowngrade = currentPlanLevel !== -1 && targetPlanLevel < currentPlanLevel;

          return (
            <div
              key={plan.id}
              className={`relative border rounded-lg p-4 flex flex-col ${
                isCurrentPlan
                  ? 'border-green-500 bg-green-50/50 shadow-lg'
                  : isPopular
                  ? 'border-primary-500 shadow-xl bg-gradient-to-b from-primary-50 to-white'
                  : 'border-slate-200 hover:shadow-lg bg-white'
              } transition-all`}
            >
              {/* Current Plan or Popular Badge */}
              {isCurrentPlan ? (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              ) : isPopular ? (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              ) : null}

              <div className="text-center mb-4 pt-2">
                <h3 className="text-xl font-bold text-ink mb-2">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-3xl font-bold text-ink">${Number(plan.price).toFixed(0)}</span>
                  <span className="text-slate-600 text-sm">/{plan.billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              {/* Limits & Restrictions */}
              <div className="mb-3 border-b border-slate-200 pb-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Limits</h4>
                <ul className="space-y-1.5">
                  {Object.entries(plan.limits || {}).map(([key, value]: [string, any]) => {
                    const labelMap: Record<string, string> = {
                      properties: 'Properties',
                      tenants: 'Tenants',
                      users: 'Users',
                      storage: 'Storage',
                      apiCalls: 'API Calls',
                    };
                    const label = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    const displayValue = value === 999999 ? '∞' : value.toLocaleString();
                    const unit = key === 'storage' ? 'MB' : key === 'apiCalls' ? '/hr' : '';
                    return (
                      <li key={key} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-ink text-xs">
                          {displayValue}{unit && ` ${unit}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Features */}
              <div className="mb-4 flex-grow">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Features</h4>
                <ul className="space-y-1.5">
                  {Object.entries(plan.features || {}).map(([key, value]: [string, any]) => {
                    const featureMap: Record<string, string> = {
                      properties: 'Properties',
                      tenants: 'Tenants',
                      leases: 'Leases',
                      workOrders: 'Work Orders',
                      reports: 'Reports',
                      api: 'API Access',
                      advancedReports: 'Adv. Reports',
                      sso: 'SSO',
                      whiteLabel: 'White Label',
                      dedicatedSupport: 'Dedicated Support',
                    };
                    const featureLabel = featureMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    return (
                      <li key={key} className="flex items-center gap-2 text-xs">
                        {value ? (
                          <>
                            <span className="text-green-600 font-bold">✓</span>
                            <span className="text-slate-700">{featureLabel}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-300">✗</span>
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
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isCurrentPlan
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : isDowngrade
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : isPopular
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-ink text-white hover:bg-ink/90'
                } disabled:opacity-50`}
              >
                {isCurrentPlan
                  ? 'Current Plan'
                  : subscribe.isPending
                  ? isDowngrade
                    ? 'Downgrading...'
                    : 'Subscribing...'
                  : isDowngrade
                  ? 'Downgrade'
                  : plan.price === 0
                  ? 'Get Started'
                  : 'Upgrade'}
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

