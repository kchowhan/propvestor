import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-100/40 via-accent-50/30 to-primary-50/50 border-b border-primary-200">
        <div className="container mx-auto px-6 pt-16 pb-12 md:pt-20 md:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-ink tracking-tight">
              Agentic AI-First
              <br />
              Property & Investment Management
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Autonomous AI agents that proactively manage your rental properties, HOA communities, 
              and investment portfolios. Built AI-first with intelligent automation and proactive insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="http://localhost:3000/login"
                className="inline-block bg-ink text-white font-medium px-8 py-4 rounded-md hover:bg-primary-800 transition-colors text-base shadow-lg shadow-ink/10"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="inline-block bg-white text-ink font-medium px-8 py-4 rounded-md border-2 border-accent-300 hover:border-accent-400 hover:bg-accent-50 transition-colors text-base"
              >
                Learn More
              </Link>
            </div>
            <p className="mt-6 text-accent-600 text-sm font-medium">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Overview Section */}
      <section id="features" className="pt-12 pb-16 md:pt-16 md:pb-20 bg-gradient-to-b from-primary-50/50 via-accent-50/20 to-primary-100/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 tracking-tight">
              AI-First Platform
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Built from the ground up with agentic AI, delivering intelligent automation 
              and proactive insights
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Feature 1 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">🏠</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Property Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track all your properties, units, and their details in one centralized dashboard. 
                Upload documents, photos, and manage property-specific information.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Tenant Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Screen applicants, manage leases, track rent payments, and communicate with 
                tenants. Automated reminders for late payments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Financial Tracking
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track income and expenses, generate financial reports, and stay on top of 
                your cash flow. Accept online rent payments with ease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">🔧</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Maintenance Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Create and assign work orders, track vendor performance, and maintain 
                detailed maintenance history for each property.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">📄</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Document Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Store and organize all property documents, leases, inspection reports, 
                and receipts in one secure, searchable location.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/90 to-primary-100/60 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Analytics & Reports
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gain insights into your portfolio performance with detailed analytics, 
                occupancy rates, and customizable financial reports.
              </p>
            </div>

            {/* Feature 7 - HOA Management */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-accent-100/90 to-accent-200/70 backdrop-blur-sm border-2 border-accent-300 hover:border-accent-500 hover:shadow-md hover:from-accent-100 hover:to-accent-200 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-300 to-accent-400 flex items-center justify-center mb-3 group-hover:from-accent-400 group-hover:to-accent-500 transition-colors">
                <span className="text-accent-800 text-xl">🏘️</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                HOA Management
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Comprehensive HOA management with homeowner portals, online fee payments, 
                maintenance requests, board member tracking, and automated late fees.
              </p>
            </div>

            {/* Feature 8 - Investment Management (Coming Soon) */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-50/70 to-primary-100/50 backdrop-blur-sm border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-primary-100 hover:to-primary-200 transition-all opacity-75">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center mb-3 group-hover:from-primary-300 group-hover:to-primary-400 transition-colors">
                <span className="text-primary-700 text-xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Investment Management
                <span className="ml-2 text-xs font-normal text-slate-500">(Coming Soon)</span>
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Portfolio tracking, performance analytics, and intelligent investment insights 
                to optimize your real estate investment strategy.
              </p>
            </div>

            {/* Feature 9 - Agentic AI */}
            <div className="group p-5 rounded-lg bg-gradient-to-br from-primary-200/90 to-primary-300/70 backdrop-blur-sm border-2 border-primary-400 hover:border-primary-600 hover:shadow-md hover:from-primary-200 hover:to-primary-300 transition-all">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink to-primary-800 flex items-center justify-center mb-3 group-hover:from-primary-800 group-hover:to-primary-900 transition-colors">
                <span className="text-white text-xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                Agentic AI
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Autonomous AI agents proactively manage your properties, automate workflows, 
                provide intelligent insights, and work autonomously to optimize operations.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/features"
              className="inline-block text-accent-600 font-medium hover:text-accent-700 text-sm transition-colors"
            >
              View All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-accent-50/40 via-primary-50/30 to-primary-100/40 border-t border-primary-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 tracking-tight">
              Simple Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Choose the plan that's right for your portfolio size
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gradient-to-br from-white/95 to-primary-50/80 backdrop-blur-sm p-6 rounded-lg border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-white hover:to-primary-100 transition-all">
              <h3 className="text-lg font-semibold text-ink mb-2">Free</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $0<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>1 property</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Up to 5 tenants</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Basic features</span>
                </li>
              </ul>
            </div>

            {/* Basic Plan */}
            <div className="bg-gradient-to-br from-white/95 to-primary-50/80 backdrop-blur-sm p-6 rounded-lg border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-white hover:to-primary-100 transition-all">
              <h3 className="text-lg font-semibold text-ink mb-2">Basic</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $49<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Up to 10 properties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Unlimited tenants</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Rent tracking</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-ink text-white p-6 rounded-lg border-2 border-primary-300 shadow-lg relative">
              <div className="absolute -top-3 right-4 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-lg font-semibold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                $99<span className="text-lg font-normal opacity-80">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-primary-100 text-sm">
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Up to 50 properties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white mr-2">✓</span>
                  <span>Online payments</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gradient-to-br from-white/95 to-primary-50/80 backdrop-blur-sm p-6 rounded-lg border border-primary-300 hover:border-primary-500 hover:shadow-md hover:from-white hover:to-primary-100 transition-all">
              <h3 className="text-lg font-semibold text-ink mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-ink mb-6">
                $249<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600 text-sm">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Unlimited properties</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Custom integrations</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="inline-block text-accent-600 font-medium hover:text-accent-700 text-sm transition-colors"
            >
              View Detailed Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-ink text-white border-t border-primary-200">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Experience AI-First Property & Investment Management
          </h2>
          <p className="text-lg text-primary-300 mb-8 max-w-xl mx-auto">
            Join property managers, HOA boards, and real estate investors who trust PropVestor's agentic AI 
            to autonomously manage their properties, communities, and portfolios.
          </p>
          <Link
            href="http://localhost:3000/login"
            className="inline-block bg-white text-ink font-medium px-8 py-4 rounded-md hover:bg-primary-100 transition-colors text-base"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-6 text-primary-400 text-sm">
            14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
