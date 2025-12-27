/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Disable Turbopack for Docker builds (uses webpack instead)
  // This avoids monorepo resolution issues in Docker
  // Turbopack can be enabled for local dev if needed
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  // Exclude pages directory from being treated as routes
  // The /pages directory contains components, not route files
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // TypeScript config
  typescript: {
    // Allow build to continue even with type errors in CI (we check types separately)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

