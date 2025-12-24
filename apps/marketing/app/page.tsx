import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Property Management
              <br />
              <span className="text-primary-200">Made Simple</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 leading-relaxed">
              Streamline your rental property operations with PropVestor. 
              Manage tenants, track rent, maintenance, and grow your portfolio 
              with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="http://localhost:3000/login"
                className="inline-block bg-white text-primary-700 font-semibold px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors text-lg shadow-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="inline-block bg-primary-500 text-white font-semibold px-8 py-4 rounded-lg hover:bg-primary-400 transition-colors text-lg"
              >
                Learn More
              </Link>
            </div>
            <p className="mt-6 text-primary-200 text-sm">
              14-day free trial • No credit card required
            </p>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Overview Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-ink mb-4">
              Everything You Need to Manage Properties
            </h2>
            <p className="text-xl text-ink/70 max-w-2xl mx-auto">
              Powerful features designed for landlords, property managers, and real estate investors
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                🏠
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Property Management
              </h3>
              <p className="text-ink/70">
                Track all your properties, units, and their details in one centralized dashboard. 
                Upload documents, photos, and manage property-specific information.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                👥
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Tenant Management
              </h3>
              <p className="text-ink/70">
                Screen applicants, manage leases, track rent payments, and communicate with 
                tenants. Automated reminders for late payments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                💰
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Financial Tracking
              </h3>
              <p className="text-ink/70">
                Track income and expenses, generate financial reports, and stay on top of 
                your cash flow. Accept online rent payments with ease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                🔧
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Maintenance Management
              </h3>
              <p className="text-ink/70">
                Create and assign work orders, track vendor performance, and maintain 
                detailed maintenance history for each property.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                📄
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Document Management
              </h3>
              <p className="text-ink/70">
                Store and organize all property documents, leases, inspection reports, 
                and receipts in one secure, searchable location.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-surface p-8 rounded-xl border border-ink/10 hover:border-primary-400 transition-colors">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
                📊
              </div>
              <h3 className="text-2xl font-semibold text-ink mb-3">
                Analytics & Reports
              </h3>
              <p className="text-ink/70">
                Gain insights into your portfolio performance with detailed analytics, 
                occupancy rates, and customizable financial reports.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/features"
              className="inline-block text-primary-600 font-semibold hover:text-primary-700 text-lg"
            >
              View All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-ink mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-ink/70 max-w-2xl mx-auto">
              Choose the plan that's right for your portfolio size
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-xl border-2 border-ink/10 hover:border-primary-400 transition-colors">
              <h3 className="text-2xl font-bold text-ink mb-2">Free</h3>
              <div className="text-4xl font-bold text-ink mb-4">
                $0<span className="text-lg font-normal text-ink/60">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-ink/70">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  1 property
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Up to 5 tenants
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Basic features
                </li>
              </ul>
            </div>

            {/* Basic Plan */}
            <div className="bg-white p-8 rounded-xl border-2 border-ink/10 hover:border-primary-400 transition-colors">
              <h3 className="text-2xl font-bold text-ink mb-2">Basic</h3>
              <div className="text-4xl font-bold text-ink mb-4">
                $49<span className="text-lg font-normal text-ink/60">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-ink/70">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Up to 10 properties
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited tenants
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Rent tracking
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-primary-600 text-white p-8 rounded-xl border-2 border-primary-600 relative shadow-xl transform scale-105">
              <div className="absolute top-0 right-0 bg-yellow-400 text-ink text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">
                $99<span className="text-lg font-normal opacity-80">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-primary-200 mr-2">✓</span>
                  Up to 50 properties
                </li>
                <li className="flex items-start">
                  <span className="text-primary-200 mr-2">✓</span>
                  Advanced analytics
                </li>
                <li className="flex items-start">
                  <span className="text-primary-200 mr-2">✓</span>
                  Online payments
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-xl border-2 border-ink/10 hover:border-primary-400 transition-colors">
              <h3 className="text-2xl font-bold text-ink mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-ink mb-4">
                $249<span className="text-lg font-normal text-ink/60">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-ink/70">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited properties
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Custom integrations
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="inline-block text-primary-600 font-semibold hover:text-primary-700 text-lg"
            >
              View Detailed Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Simplify Your Property Management?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of landlords and property managers who trust PropVestor 
            to manage their rental properties.
          </p>
          <Link
            href="http://localhost:3000/login"
            className="inline-block bg-white text-primary-700 font-semibold px-10 py-5 rounded-lg hover:bg-primary-50 transition-colors text-xl shadow-xl"
          >
            Start Your Free Trial
          </Link>
          <p className="mt-6 text-primary-200">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
