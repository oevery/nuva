import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  ssr: false,
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('../../../modules/auth/module.ts', import.meta.url)),
  ],
  runtimeConfig: {
    public: {
      nuva: {
        auth: {
          enabled: true,
          global: true,
          loginPath: '/login',
          publicRoutes: ['/login'],
          permission: {
            source: 'remote',
            remote: {
              profile: {
                url: '/api/profile',
              },
            },
          },
        },
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
