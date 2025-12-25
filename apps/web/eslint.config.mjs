import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

// Load configs separately to avoid circular reference issues
let nextConfigs = [];
try {
  nextConfigs = compat.extends('next/core-web-vitals', 'next/typescript');
} catch (error) {
  // Fallback: use core-web-vitals only if there's an error
  console.warn('Failed to load Next.js configs, using fallback:', error.message);
  nextConfigs = compat.extends('next/core-web-vitals');
}

export default [
  ...nextConfigs,
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'build/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];

