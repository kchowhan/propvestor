import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">About PropVestor</h1>
            <p className="text-xl text-primary-100">
              We're on a mission to simplify property management for landlords and investors everywhere
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-ink mb-6">Our Story</h2>
            <div className="space-y-4 text-lg text-ink/80 leading-relaxed">
              <p>
                PropVestor was born from firsthand experience with the challenges of property management.
                Our founders, experienced real estate investors themselves, struggled with spreadsheets,
                paper trails, and disconnected software tools to manage their growing portfolios.
              </p>
              <p>
                We knew there had to be a better way. That's why we built PropVestor—a comprehensive,
                user-friendly platform that brings everything a property manager needs into one place.
              </p>
              <p>
                Today, PropVestor serves thousands of landlords, property managers, and real estate
                investors, helping them save time, reduce stress, and grow their businesses with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-ink text-center mb-12">Our Mission & Values</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl border border-ink/10">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mb-4">
                  🎯
                </div>
                <h3 className="text-2xl font-semibold text-ink mb-3">Simplicity</h3>
                <p className="text-ink/70">
                  We believe property management software should be intuitive and easy to use,
                  not complicated and overwhelming.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl border border-ink/10">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mb-4">
                  🤝
                </div>
                <h3 className="text-2xl font-semibold text-ink mb-3">Reliability</h3>
                <p className="text-ink/70">
                  Your business depends on us. That's why we're committed to providing
                  secure, reliable service you can count on 24/7.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl border border-ink/10">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mb-4">
                  💡
                </div>
                <h3 className="text-2xl font-semibold text-ink mb-3">Innovation</h3>
                <p className="text-ink/70">
                  We're constantly improving and adding new features based on your
                  feedback and the latest technology trends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-ink text-center mb-12">PropVestor by the Numbers</h2>

            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2">5,000+</div>
                <div className="text-xl text-ink/70">Active Users</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2">25,000+</div>
                <div className="text-xl text-ink/70">Properties Managed</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2">$100M+</div>
                <div className="text-xl text-ink/70">Rent Collected</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2">99.9%</div>
                <div className="text-xl text-ink/70">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-ink text-center mb-6">Meet the Team</h2>
            <p className="text-xl text-ink/70 text-center mb-12 max-w-2xl mx-auto">
              We're a passionate team of developers, designers, and property management experts
              dedicated to making your life easier.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-32 h-32 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center text-6xl">
                  👨‍💼
                </div>
                <h3 className="text-xl font-semibold text-ink mb-1">John Smith</h3>
                <p className="text-primary-600 mb-2">CEO & Co-Founder</p>
                <p className="text-sm text-ink/70">
                  15 years in real estate investing and property management
                </p>
              </div>

              <div className="text-center">
                <div className="w-32 h-32 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center text-6xl">
                  👩‍💻
                </div>
                <h3 className="text-xl font-semibold text-ink mb-1">Sarah Johnson</h3>
                <p className="text-primary-600 mb-2">CTO & Co-Founder</p>
                <p className="text-sm text-ink/70">
                  Former engineer at leading SaaS companies
                </p>
              </div>

              <div className="text-center">
                <div className="w-32 h-32 bg-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center text-6xl">
                  👨‍🎨
                </div>
                <h3 className="text-xl font-semibold text-ink mb-1">Mike Chen</h3>
                <p className="text-primary-600 mb-2">Head of Product</p>
                <p className="text-sm text-ink/70">
                  Design thinking expert with a passion for user experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Join Thousands of Happy Customers</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Start managing your properties more efficiently today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="http://localhost:3000/login"
              className="inline-block bg-white text-primary-700 font-semibold px-10 py-4 rounded-lg hover:bg-primary-50 transition-colors text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="inline-block bg-primary-500 text-white font-semibold px-10 py-4 rounded-lg hover:bg-primary-400 transition-colors text-lg"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

