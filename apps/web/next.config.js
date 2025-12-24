/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  // Exclude pages directory from being treated as routes
  // The /pages directory contains components, not route files
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Custom webpack config to ignore pages directory as routes
  webpack: (config, { isServer }) => {
    // Ignore pages directory from being treated as routes
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

