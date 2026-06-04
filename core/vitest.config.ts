import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: [
        'app/**/*.{ts,vue}',
        'config/**/*.ts',
        'modules/**/*.ts',
        'server/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.css',
        '**/app.config.ts',
        '**/modules/auth/runtime/middleware/auth.ts',
        '**/nuxt.config.ts',
        'tests/**',
        '**/tests/**',
        '.nuxt/**',
        '**/.nuxt/**',
        '.output/**',
        '**/.output/**',
        'node_modules/**',
        '**/node_modules/**',
      ],
    },
    projects: [
      await defineVitestProject({
        test: {
          name: 'nuxt-runtime',
          globals: true,
          setupFiles: ['./tests/setup.ts'],
          include: [
            './tests/unit/**/*.spec.ts',
            './tests/runtime/**/*.spec.ts',
          ],
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('./tests/fixtures/base', import.meta.url)),
              domEnvironment: 'happy-dom',
              mock: {
                intersectionObserver: true,
                indexedDb: true,
              },
            },
          },
        },
      }),
      {
        test: {
          name: 'e2e-node',
          environment: 'node',
          globals: true,
          fileParallelism: false,
          maxWorkers: 1,
          minWorkers: 1,
          testTimeout: 30000,
          hookTimeout: 120000,
          include: [
            './tests/e2e/**/*.spec.ts',
          ],
        },
      },
    ],
  },
})
