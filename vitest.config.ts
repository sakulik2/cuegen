import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The domain layer is DOM-free, so the default node environment is enough.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
