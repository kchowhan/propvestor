import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight text-ink tracking-tight">
              Agentic AI-First
              <br />
              Property Management
            </h1>
            <p className="text-xl md:text-2xl mb-8 md:mb-10 text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Autonomous AI agents that proactively manage your properties, automate workflows, 
              and provide intelligent insights—all built AI-first from the ground up.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="http://localhost:3000/login"
                className="inline-block bg-ink text-white font-medium px-8 py-4 rounded-md hover:bg-slate-800 transition-colors text-base"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="inline-block bg-white text-ink font-medium px-8 py-4 rounded-md border-2 border-ink hover:bg-slate-50 transition-colors text-base"
              >
                Learn More
              </Link>
            </div>
            <p className="mt-6 text-slate-500 text-sm">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Overview Section */}
      <section id="features" className="pt-8 pb-20 md:pt-12 md:pb-28 lg:pb-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 tracking-tight">
              AI-First Platform
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Built from the ground up with agentic AI, delivering intelligent automation 
              and proactive insights
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Feature 1 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Property Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track all your properties, units, and their details in one centralized dashboard. 
                Upload documents, photos, and manage property-specific information.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Tenant Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Screen applicants, manage leases, track rent payments, and communicate with 
                tenants. Automated reminders for late payments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Financial Tracking
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track income and expenses, generate financial reports, and stay on top of 
                your cash flow. Accept online rent payments with ease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Maintenance Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Create and assign work orders, track vendor performance, and maintain 
                detailed maintenance history for each property.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Document Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Store and organize all property documents, leases, inspection reports, 
                and receipts in one secure, searchable location.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Analytics & Reports
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gain insights into your portfolio performance with detailed analytics, 
                occupancy rates, and customizable financial reports.
              </p>
            </div>

            {/* Feature 7 - HOA Management */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                HOA Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Comprehensive HOA management with homeowner portals, online fee payments, 
                maintenance requests, board member tracking, and automated late fees.
              </p>
            </div>

            {/* Feature 8 - Agentic AI */}
            <div className="group">
              <h3 className="text-lg font-semibold text-ink mb-3">
                Agentic AI
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Autonomous AI agents proactively manage your properties, automate workflows, 
                provide intelligent insights, and work autonomously to optimize operations.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link
              href="/features"
              className="inline-block text-slate-600 font-medium hover:text-ink text-sm transition-colors"
            >
              View All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 md:py-28 lg:py-32 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 tracking-tight">
              Simple Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Choose the plan that's right for your portfolio size
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-ink mb-2">Free</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $0<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li>1 property</li>
                <li>Up to 5 tenants</li>
                <li>Basic features</li>
              </ul>
            </div>

            {/* Basic Plan */}
            <div className="bg-white p-8 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-ink mb-2">Basic</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $49<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li>Up to 10 properties</li>
                <li>Unlimited tenants</li>
                <li>Rent tracking</li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-ink text-white p-8 rounded-lg border border-ink">
              <h3 className="text-lg font-semibold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                $99<span className="text-lg font-normal opacity-70">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-300 text-sm">
                <li>Up to 50 properties</li>
                <li>Advanced analytics</li>
                <li>Online payments</li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-ink mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $249<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li>Unlimited properties</li>
                <li>Priority support</li>
                <li>Custom integrations</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link
              href="/pricing"
              className="inline-block text-slate-600 font-medium hover:text-ink text-sm transition-colors"
            >
              View Detailed Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 lg:py-32 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-ink tracking-tight">
            Experience AI-First Property Management
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
            Join thousands of landlords and property managers who trust PropVestor's agentic AI 
            to autonomously manage their rental properties.
          </p>
          <Link
            href="http://localhost:3000/login"
            className="inline-block bg-ink text-white font-medium px-8 py-4 rounded-md hover:bg-slate-800 transition-colors text-base"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-8 text-slate-500 text-sm">
            14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
