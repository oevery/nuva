import type { NuvaPublicConfig } from '@oevery/nuva/app/types/config'

const nuva = {
  api: {
    baseURL: '/api',
    envelopeUnwrap: true,
    successCodes: '0,200,SUCCESS',
    token: {
      cookieName: 'token',
      storageKey: 'token',
      header: 'Authorization',
      prefix: 'Bearer',
    },
  },
} satisfies NuvaPublicConfig

export default defineNuxtConfig({
  extends: ['@oevery/nuva'],
  srcDir: 'app',
  modules: [
    '@vee-validate/nuxt',
  ],
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
      nuva,
    },
  },
  compatibilityDate: '2026-05-30',
})
