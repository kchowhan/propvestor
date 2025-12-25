'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
      category: 'HOA Management',
      icon: '🏘️',
      items: [
        {
          title: 'Association Management',
          description: 'Create and manage HOA associations with homeowner and board member tracking.',
        },
        {
          title: 'Homeowner Portal',
          description: 'Dedicated portal for homeowners to view fees, make payments, and submit maintenance requests.',
        },
        {
          title: 'Online HOA Fee Payments',
          description: 'Secure online payment processing for HOA fees with Stripe integration, payment method management, and automatic late fee calculation.',
        },
        {
          title: 'Board Member Management',
          description: 'Track board member roles, tenure, and permissions with historical records.',
        },
        {
          title: 'Maintenance Requests',
          description: 'Homeowners can submit maintenance requests directly through the portal with email notifications and status tracking.',
        },
        {
          title: 'Account Balance Tracking',
          description: 'Real-time account balance tracking for homeowners with payment history and fee details.',
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
    {
      category: 'Agentic AI & Automation',
      icon: '🤖',
      items: [
        {
          title: 'Autonomous AI Agents',
          description: 'Agentic AI agents that work autonomously to manage properties, automate workflows, and make intelligent decisions without constant manual intervention.',
        },
        {
          title: 'Proactive Insights',
          description: 'AI agents proactively analyze your portfolio, identify opportunities, predict issues, and recommend actions before problems arise.',
        },
        {
          title: 'Intelligent Automation',
          description: 'Automate repetitive tasks like rent reminders, maintenance scheduling, document organization, and financial reporting with AI that learns your preferences.',
        },
        {
          title: 'AI-First Architecture',
          description: 'Built from the ground up with AI at the core, not as an afterthought. Every feature leverages agentic AI to work smarter and more efficiently.',
        },
        {
          title: 'Natural Language Interface',
          description: 'Interact with your property data using natural language. Ask questions, get insights, and manage properties through conversational AI.',
        },
        {
          title: 'Predictive Analytics',
          description: 'AI-powered predictions for occupancy rates, maintenance needs, rent optimization, and portfolio growth opportunities.',
        },
      ],
    },
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);

  // Set initial tab from URL hash if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const index = features.findIndex(
          (f) => f.category.toLowerCase().replace(/\s+/g, '-') === hash
        );
        if (index !== -1) {
          setActiveTab(index);
        }
      }
    }
  }, []);

  const activeCategory = features[activeTab];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-ink text-white py-16 border-b border-primary-200">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Agentic AI-First Features
            </h1>
            <p className="text-xl text-primary-300 mb-8 leading-relaxed">
              Built with agentic AI at the core, PropVestor delivers autonomous agents that proactively 
              manage your rental properties, HOA communities, and investment portfolios with intelligent automation.
            </p>
            <Link
              href="http://localhost:3000/login"
              className="inline-block bg-white text-ink font-semibold px-8 py-4 rounded-lg hover:bg-primary-100 transition-colors text-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content with Vertical Tabs */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
            {/* Vertical Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="sticky top-24 bg-white border border-primary-200 rounded-xl p-4 shadow-sm">
                <nav className="space-y-2">
                  {features.map((category, idx) => {
                    const isActive = idx === activeTab;
                    const isHOA = category.category === 'HOA Management';
                    const isAI = category.category === 'Agentic AI & Automation';
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab(idx);
                          window.history.replaceState(
                            null,
                            '',
                            `#${category.category.toLowerCase().replace(/\s+/g, '-')}`
                          );
                        }}
                        className={`w-full text-left px-4 py-4 rounded-lg font-medium transition-all ${
                          isActive
                            ? isHOA
                              ? 'bg-accent-50 border-2 border-accent-500 text-accent-700 shadow-sm'
                              : isAI
                              ? 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-sm'
                              : 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-sm'
                            : 'border-2 border-transparent text-slate-700 hover:bg-primary-50 hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <span className="text-base">{category.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl ${
                  activeCategory.category === 'HOA Management' 
                    ? 'bg-accent-100 text-accent-700' 
                    : activeCategory.category === 'Agentic AI & Automation'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {activeCategory.icon}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-ink">{activeCategory.category}</h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCategory.items.map((feature, featureIdx) => (
                  <div
                    key={featureIdx}
                    className={`group p-6 rounded-xl border transition-all hover:shadow-lg ${
                      activeCategory.category === 'HOA Management'
                        ? 'bg-white border-accent-200 hover:border-accent-400'
                        : activeCategory.category === 'Agentic AI & Automation'
                        ? 'bg-primary-50 border-primary-200 hover:border-primary-400'
                        : 'bg-white border-primary-200 hover:border-primary-400'
                    }`}
                  >
                    <h3 className={`text-lg font-semibold mb-2 ${
                      activeCategory.category === 'HOA Management'
                        ? 'text-accent-700'
                        : 'text-ink'
                    }`}>
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-ink text-white border-t border-primary-200">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Ready to Experience AI-First Management?</h2>
          <p className="text-xl text-primary-300 mb-8 max-w-2xl mx-auto">
            Join property managers, HOA boards, and real estate investors who trust PropVestor's agentic AI 
            to autonomously manage their properties with intelligent automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="http://localhost:3000/login"
              className="inline-block bg-white text-ink font-semibold px-10 py-4 rounded-lg hover:bg-primary-100 transition-colors text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-block bg-primary-700 text-white font-semibold px-10 py-4 rounded-lg hover:bg-primary-600 transition-colors text-lg"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
