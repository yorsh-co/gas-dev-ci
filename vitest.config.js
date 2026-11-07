// @ts-check
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js', 'bin/**/*.js'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 97, branches: 90, functions: 98, statements: 97 },
    },
  },
});
