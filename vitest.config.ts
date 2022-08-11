import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  test: {
    coverage: {
      enabled: !!process.env.CI,
    },
  },
}));
