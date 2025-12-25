// ESLint config for Next.js 14 with ESLint 8
// Using .eslintrc format via .mjs for compatibility
module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  ignorePatterns: ['.next/**', 'node_modules/**', 'dist/**', 'build/**', 'out/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
