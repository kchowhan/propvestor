'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual form submission to API
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Get in Touch</h1>
            <p className="text-xl text-primary-100">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-ink mb-6">Send Us a Message</h2>

              {submitted && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
                  Thank you! We've received your message and will get back to you soon.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-ink mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Your company"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-ink mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-ink mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select a subject</option>
                    <option value="sales">Sales Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-ink mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-3xl font-bold text-ink mb-6">Contact Information</h2>

              <div className="space-y-6 mb-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mr-4">
                    📧
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Email</h3>
                    <p className="text-ink/70">support@propvestor.com</p>
                    <p className="text-sm text-ink/60">We typically respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mr-4">
                    📞
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Phone</h3>
                    <p className="text-ink/70">1-800-PROPVEST</p>
                    <p className="text-sm text-ink/60">Monday - Friday, 9am - 5pm EST</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-2xl mr-4">
                    📍
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Office</h3>
                    <p className="text-ink/70">
                      123 Main Street<br />
                      San Francisco, CA 94105<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-surface p-6 rounded-xl border border-ink/10">
                <h3 className="font-semibold text-ink mb-4">Looking for something specific?</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/pricing" className="text-primary-600 hover:text-primary-700 font-medium">
                      View Pricing Plans →
                    </Link>
                  </li>
                  <li>
                    <Link href="/features" className="text-primary-600 hover:text-primary-700 font-medium">
                      Explore Features →
                    </Link>
                  </li>
                  <li>
                    <Link href="http://localhost:3000/login" className="text-primary-600 hover:text-primary-700 font-medium">
                      Start Free Trial →
                    </Link>
                  </li>
                  <li>
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      Help Center →
                    </a>
                  </li>
                </ul>
              </div>

              {/* Support Hours */}
              <div className="mt-8 bg-primary-50 p-6 rounded-xl border border-primary-200">
                <h3 className="font-semibold text-ink mb-3">Support Hours</h3>
                <div className="space-y-2 text-sm text-ink/70">
                  <p><strong>Email Support:</strong> 24/7</p>
                  <p><strong>Phone Support:</strong> Mon-Fri, 9am - 5pm EST</p>
                  <p><strong>Live Chat:</strong> Mon-Fri, 9am - 5pm EST</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-ink text-center mb-12">Common Questions</h2>

            <div className="space-y-4">
              <details className="bg-white p-6 rounded-xl border border-ink/10 cursor-pointer">
                <summary className="font-semibold text-ink">How quickly will I get a response?</summary>
                <p className="mt-3 text-ink/70">
                  We typically respond to all inquiries within 24 hours during business days. 
                  Pro and Enterprise customers receive priority support with faster response times.
                </p>
              </details>

              <details className="bg-white p-6 rounded-xl border border-ink/10 cursor-pointer">
                <summary className="font-semibold text-ink">Can I schedule a demo?</summary>
                <p className="mt-3 text-ink/70">
                  Yes! We'd be happy to give you a personalized demo of PropVestor. Just mention 
                  "Demo Request" in your message subject and include your preferred times.
                </p>
              </details>

              <details className="bg-white p-6 rounded-xl border border-ink/10 cursor-pointer">
                <summary className="font-semibold text-ink">Do you offer technical support?</summary>
                <p className="mt-3 text-ink/70">
                  Absolutely! Our support team is here to help with any technical issues or questions 
                  you might have. All paid plans include comprehensive technical support.
                </p>
              </details>

              <details className="bg-white p-6 rounded-xl border border-ink/10 cursor-pointer">
                <summary className="font-semibold text-ink">Can I talk to sales about Enterprise pricing?</summary>
                <p className="mt-3 text-ink/70">
                  Yes! Select "Sales Inquiry" as your subject and mention that you're interested in 
                  Enterprise pricing. Our sales team will reach out to discuss your specific needs.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

