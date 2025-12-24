import Link from 'next/link';

export default function FeaturesPage() {
  const features = [
    {
      category: 'Property Management',
      icon: '🏠',
      items: [
        {
          title: 'Multi-Property Dashboard',
          description: 'View and manage all your properties from a single, intuitive dashboard.',
        },
        {
          title: 'Unit Management',
          description: 'Track individual units, their status, amenities, and rental rates.',
        },
        {
          title: 'Document Storage',
          description: 'Securely store property documents, photos, and inspection reports.',
        },
        {
          title: 'Property Analytics',
          description: 'Get insights on occupancy rates, revenue, and property performance.',
        },
      ],
    },
    {
      category: 'Tenant Management',
      icon: '👥',
      items: [
        {
          title: 'Tenant Screening',
          description: 'Screen applicants with credit checks, background checks, and rental history via RentSpree.',
        },
        {
          title: 'Digital Lease Agreements',
          description: 'Create, sign, and manage leases electronically with DocuSign integration.',
        },
        {
          title: 'Tenant Portal',
          description: 'Give tenants access to pay rent, submit maintenance requests, and view documents.',
        },
        {
          title: 'Communication Tools',
          description: 'Send automated reminders, announcements, and manage tenant communications.',
        },
      ],
    },
    {
      category: 'Financial Management',
      icon: '💰',
      items: [
        {
          title: 'Rent Collection',
          description: 'Accept online rent payments via Stripe with automatic payment reminders.',
        },
        {
          title: 'Expense Tracking',
          description: 'Record and categorize all property-related expenses for tax time.',
        },
        {
          title: 'Financial Reports',
          description: 'Generate profit & loss statements, cash flow reports, and tax summaries.',
        },
        {
          title: 'Payment Reconciliation',
          description: 'Automatically match payments to charges and track outstanding balances.',
        },
      ],
    },
    {
      category: 'Maintenance & Work Orders',
      icon: '🔧',
      items: [
        {
          title: 'Work Order Management',
          description: 'Create, assign, and track maintenance requests from start to completion.',
        },
        {
          title: 'Vendor Management',
          description: 'Maintain a database of trusted vendors with contact info and service history.',
        },
        {
          title: 'Preventive Maintenance',
          description: 'Schedule recurring maintenance tasks to keep properties in top condition.',
        },
        {
          title: 'Mobile Access',
          description: 'Manage work orders and communicate with vendors on the go.',
        },
      ],
    },
    {
      category: 'Reporting & Analytics',
      icon: '📊',
      items: [
        {
          title: 'Portfolio Dashboard',
          description: 'Real-time overview of your entire portfolio performance and metrics.',
        },
        {
          title: 'Custom Reports',
          description: 'Generate customized reports for owners, investors, and tax purposes.',
        },
        {
          title: 'Occupancy Tracking',
          description: 'Monitor vacancy rates and identify trends across your properties.',
        },
        {
          title: 'ROI Analysis',
          description: 'Calculate return on investment for individual properties and your portfolio.',
        },
      ],
    },
    {
      category: 'Team & Organization',
      icon: '👨‍💼',
      items: [
        {
          title: 'Multi-User Access',
          description: 'Invite team members with customizable role-based permissions.',
        },
        {
          title: 'Organization Management',
          description: 'Manage multiple organizations or property portfolios under one account.',
        },
        {
          title: 'Activity Logs',
          description: 'Track all user actions and changes for accountability and audit trails.',
        },
        {
          title: 'Admin Dashboard',
          description: 'Super admin tools for managing organizations, users, and subscriptions.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Powerful Features for Property Management</h1>
            <p className="text-xl text-primary-100 mb-8">
              Everything you need to manage your rental properties efficiently and profitably
            </p>
            <Link
              href="http://localhost:3000/login"
              className="inline-block bg-white text-primary-700 font-semibold px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors text-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="space-y-20">
            {features.map((category, idx) => (
              <div key={idx} className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center text-3xl">
                    {category.icon}
                  </div>
                  <h2 className="text-4xl font-bold text-ink">{category.category}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {category.items.map((feature, featureIdx) => (
                    <div
                      key={featureIdx}
                      className="bg-surface p-6 rounded-xl border border-ink/10 hover:border-primary-400 transition-all hover:shadow-lg"
                    >
                      <h3 className="text-xl font-semibold text-ink mb-3">{feature.title}</h3>
                      <p className="text-ink/70">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of property managers who trust PropVestor
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="http://localhost:3000/login"
              className="inline-block bg-white text-primary-700 font-semibold px-10 py-4 rounded-lg hover:bg-primary-50 transition-colors text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-block bg-primary-500 text-white font-semibold px-10 py-4 rounded-lg hover:bg-primary-400 transition-colors text-lg"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

