import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import './globals.css';

export const metadata: Metadata = {
  title: 'PropVestor - Agentic AI-First Property & Investment Management Made Simple',
  description: 'Built AI-first with agentic AI at its core. PropVestor uses autonomous AI agents to streamline your rental property operations, manage tenants, track rent, maintenance, and grow your portfolio with proactive intelligent insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Navigation */}
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-10 w-auto" />
                <span className="text-xl font-bold text-ink">PropVestor</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/features" className="text-slate-600 hover:text-ink text-sm font-medium transition-colors">
                  Features
                </Link>
                <Link href="/pricing" className="text-slate-600 hover:text-ink text-sm font-medium transition-colors">
                  Pricing
                </Link>
                <Link href="/about" className="text-slate-600 hover:text-ink text-sm font-medium transition-colors">
                  About
                </Link>
                <Link href="/contact" className="text-slate-600 hover:text-ink text-sm font-medium transition-colors">
                  Contact
                </Link>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center space-x-4">
                <Link
                  href="http://localhost:3000/login"
                  className="text-slate-600 hover:text-ink text-sm font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="http://localhost:3000/login"
                  className="bg-ink text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        {children}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100">
          <div className="container mx-auto px-6 py-16">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              {/* Company Info */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Logo className="h-8 w-auto" />
                  <span className="text-lg font-semibold text-ink">PropVestor</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Agentic AI-first property and investment management platform. Built with autonomous AI agents 
                  that proactively manage your properties with intelligent automation.
                </p>
              </div>

              {/* Product */}
              <div>
                <h3 className="font-semibold text-ink mb-4 text-sm">Product</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <Link href="/features" className="hover:text-ink transition-colors">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-ink transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="http://localhost:3000/login" className="hover:text-ink transition-colors">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link href="http://localhost:3000/login" className="hover:text-ink transition-colors">
                      Log In
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold text-ink mb-4 text-sm">Company</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <Link href="/about" className="hover:text-ink transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-ink transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-ink transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-ink transition-colors">
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-semibold text-ink mb-4 text-sm">Legal</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <Link href="#" className="hover:text-ink transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-ink transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-ink transition-colors">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 text-center text-sm text-slate-500">
              <p>© {new Date().getFullYear()} PropVestor. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
