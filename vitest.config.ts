import { defineConfig } from 'vitest/config';

// Unit tests target the pure-function libs (scoring / classification / streak).
// No React Native runtime — keep these modules free of native imports.
export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
