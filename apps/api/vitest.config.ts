import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup/stripe-mock.ts'],
    globalSetup: ['./src/tests/setup/global-setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'prisma/',
        'src/index.ts',
        'src/types/',
      ],
      thresholds: {
        lines: 80,
        functions: 89, // 89.22% actual coverage
        branches: 64.5, // 64.94% actual coverage
        statements: 80,
      },
    },
  },
});

