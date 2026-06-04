import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('../../../modules/auth/module.ts', import.meta.url)),
  ],
  runtimeConfig: {
    public: {
      nuva: {
        auth: {
          enabled: true,
          provider: 'better-auth',
          betterAuth: {
            basePath: '/api/auth',
            serverAuthImport: '~~/server/utils/better-auth',
          },
          permission: {
            source: 'better-auth',
            betterAuth: {
              organization: true,
            },
            forbiddenPath: '/403',
          },
          publicRoutes: ['/login'],
        },
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
