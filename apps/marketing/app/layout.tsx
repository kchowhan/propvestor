import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import './globals.css';

export const metadata: Metadata = {
  title: 'PropVestor - AI-Powered Property & Investment Management Made Simple',
  description: 'Streamline your rental property operations with AI-powered PropVestor. Manage tenants, track rent, maintenance, and grow your portfolio with intelligent insights.',
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
        <nav className="bg-white border-b border-ink/10 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-10 w-auto" />
                <span className="text-xl font-bold text-ink">PropVestor</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/features" className="text-ink/70 hover:text-primary-600 font-medium transition-colors">
                  Features
                </Link>
                <Link href="/pricing" className="text-ink/70 hover:text-primary-600 font-medium transition-colors">
                  Pricing
                </Link>
                <Link href="/about" className="text-ink/70 hover:text-primary-600 font-medium transition-colors">
                  About
                </Link>
                <Link href="/contact" className="text-ink/70 hover:text-primary-600 font-medium transition-colors">
                  Contact
                </Link>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center space-x-4">
                <Link
                  href="http://localhost:3000/login"
                  className="text-ink/70 hover:text-primary-600 font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="http://localhost:3000/login"
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
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
        <footer className="bg-ink text-white">
          <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              {/* Company Info */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Logo className="h-10 w-auto" />
                  <span className="text-xl font-bold text-white">PropVestor</span>
                </div>
                <p className="text-white/70 text-sm">
                  AI-powered property and investment management for landlords and investors.
                </p>
              </div>

              {/* Product */}
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-white/70">
                  <li>
                    <Link href="/features" className="hover:text-white transition-colors">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-white transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="http://localhost:3000/login" className="hover:text-white transition-colors">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link href="http://localhost:3000/login" className="hover:text-white transition-colors">
                      Log In
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-white/70">
                  <li>
                    <Link href="/about" className="hover:text-white transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-white transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors">
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-white/70">
                  <li>
                    <Link href="#" className="hover:text-white transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 text-center text-sm text-white/60">
              <p>© {new Date().getFullYear()} PropVestor. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
