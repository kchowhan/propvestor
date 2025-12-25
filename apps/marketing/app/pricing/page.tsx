import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with a single property',
      features: [
        '1 property',
        'Up to 5 tenants',
        'Basic lease management',
        'Rent tracking',
        'Basic reports',
        'Mobile app access',
        'Email support',
      ],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Basic',
      price: '$49',
      period: 'per month',
      description: 'Great for small landlords with multiple properties',
      features: [
        'Up to 10 properties',
        'Unlimited tenants',
        'Advanced lease management',
        'Online rent collection',
        'Maintenance tracking',
        'Financial reports',
        'Document storage',
        'Email & chat support',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$99',
      period: 'per month',
      description: 'Ideal for professional property managers',
      features: [
        'Up to 50 properties',
        'Unlimited tenants',
        'All Basic features',
        'Tenant screening (RentSpree)',
        'E-signature (DocuSign)',
        'Advanced analytics',
        'Custom reports',
        'API access',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$249',
      period: 'per month',
      description: 'For large portfolios and property management companies',
      features: [
        'Unlimited properties',
        'Unlimited tenants',
        'All Pro features',
        'Multiple organizations',
        'White-label options',
        'Custom integrations',
        'Dedicated account manager',
        'Phone & priority support',
        'Custom SLA',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-ink text-white py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Simple, Transparent Pricing</h1>
            <p className="text-xl text-primary-300 mb-4">
              Choose the plan that fits your portfolio size. All plans include our agentic AI-first platform 
              with autonomous AI agents that work intelligently to manage your properties, HOA communities, and investment portfolios.
            </p>
            <p className="text-primary-400">
              All plans include a 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-ink text-white shadow-2xl transform scale-105 border-4 border-primary-300 relative'
                    : 'bg-white border-2 border-primary-200 hover:border-primary-400 transition-colors'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    MOST POPULAR
                  </div>
                )}

                <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-ink'}`}>
                  {plan.name}
                </h3>

                <div className="mb-4">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-ink'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-lg ${plan.highlighted ? 'text-primary-100' : 'text-ink/60'}`}>
                    /{plan.period}
                  </span>
                </div>

                <p className={`mb-6 text-sm ${plan.highlighted ? 'text-primary-100' : 'text-ink/70'}`}>
                  {plan.description}
                </p>

                <Link
                  href={plan.name === 'Enterprise' ? '/contact' : 'http://localhost:3000/login'}
                  className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors mb-6 ${
                    plan.highlighted
                      ? 'bg-white text-ink hover:bg-primary-100'
                      : 'bg-ink text-white hover:bg-primary-800'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start">
                      <span
                        className={`mr-2 mt-1 ${
                          plan.highlighted ? 'text-primary-300' : 'text-accent-600'
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`text-sm ${plan.highlighted ? 'text-white' : 'text-ink/70'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-ink text-center mb-12">Frequently Asked Questions</h2>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">Can I change plans later?</h3>
              <p className="text-ink/70">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and we'll prorate any charges or credits.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">What happens after the free trial?</h3>
              <p className="text-ink/70">
                Your trial lasts 14 days. After that, you'll need to choose a paid plan to continue using
                PropVestor. We'll send you reminders before your trial ends.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">Are there any setup fees?</h3>
              <p className="text-ink/70">
                No setup fees, no hidden costs. You only pay the monthly subscription price for your chosen plan.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">Can I cancel anytime?</h3>
              <p className="text-ink/70">
                Yes. You can cancel your subscription at any time. Your data will remain accessible until
                the end of your billing period.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">What payment methods do you accept?</h3>
              <p className="text-ink/70">
                We accept all major credit cards (Visa, MasterCard, American Express) via Stripe.
                Enterprise customers can also pay via invoice.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-ink/10">
              <h3 className="text-xl font-semibold text-ink mb-2">Do you offer discounts for annual billing?</h3>
              <p className="text-ink/70">
                Yes! Contact our sales team for information about annual billing discounts and enterprise pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-ink text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Still Have Questions?</h2>
          <p className="text-xl text-primary-300 mb-8 max-w-2xl mx-auto">
            Our team is here to help you find the perfect plan for your needs
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-ink font-semibold px-10 py-4 rounded-lg hover:bg-primary-100 transition-colors text-lg"
          >
            Contact Sales
          </Link>
        </div>
      </section>
    </div>
  );
}

