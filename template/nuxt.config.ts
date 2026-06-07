import type { NuvaApiConfigOptions } from '@oevery/nuva/config'

const api = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0,200,SUCCESS',
} satisfies NuvaApiConfigOptions

export default defineNuxtConfig({
  extends: ['@oevery/nuva'],
  srcDir: 'app',
  css: ['~/assets/css/main.css'],
  modules: [
    '@oevery/nuva/auth',
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
      nuva: {
        api,
      },
    },
  },
  compatibilityDate: '2026-05-30',
})
