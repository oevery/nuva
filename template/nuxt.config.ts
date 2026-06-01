import type { NuvaApiConfig, NuvaAuthModuleOptions } from '@oevery/nuva/config'
import { env } from 'node:process'

const authMode = env.NUVA_AUTH_MODE === 'fullstack' ? 'fullstack' : 'frontend'

const api = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0,200,SUCCESS',
} satisfies NuvaApiConfig

const auth = {
  mode: authMode,
  loginPath: '/login',
  homePath: '/',
  redirectQuery: 'redirect',
  global: true,
  publicRoutes: ['/login'],
  betterAuth: {
    basePath: '/api/auth',
    serverAuthImport: '~~/server/utils/better-auth',
  },
} satisfies NuvaAuthModuleOptions

export default defineNuxtConfig({
  extends: ['@oevery/nuva'],
  srcDir: 'app',
  modules: [
    '@oevery/nuva/auth',
    '@vee-validate/nuxt',
  ],
  nuvaAuth: auth,
  imports: {
    dirs: [
      'composables/apis',
      'utils/http',
    ],
  },
  app: {
    head: {
      title: 'Nuva Template',
      meta: [
        { name: 'description', content: 'Business template built on the Nuva core layer.' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      nuva: {
        api,
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
