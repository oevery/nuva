import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('../../../modules/better-auth/module.ts', import.meta.url)),
  ],
  runtimeConfig: {
    public: {
      nuva: {
        auth: {
          provider: 'better-auth',
          betterAuth: {
            basePath: '/api/auth',
            serverAuthImport: '~~/server/utils/better-auth',
            organization: {
              enabled: true,
              hasPermission: true,
            },
          },
          permission: {
            forbiddenPath: '/403',
          },
          publicRoutes: ['/login'],
        },
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
