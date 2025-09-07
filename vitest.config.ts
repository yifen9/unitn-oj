import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'frontend',
          environment: 'node',
          include: ['tests/frontend/**/*.test.{js,ts}']
        }
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: ['tests/backend/**/*.test.{js,ts}']
        }
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['tests/e2e/**/*.test.{js,ts}']
        }
      }
    ]
  }
})