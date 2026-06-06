import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('../../../modules/auth/module.ts', import.meta.url)),
  ],
  runtimeConfig: {
    public: {
      nuva: {
        api: {
          baseURL: '/api',
          envelopeUnwrap: true,
          successCodes: '0',
        },
        auth: {
          enabled: true,
          global: true,
          loginPath: '/login',
          publicRoutes: ['/login'],
          permission: {
            source: 'remote',
            forbiddenPath: '/403',
            remote: {
              request: {
                url: '/api/permission',
              },
            },
          },
        },
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
