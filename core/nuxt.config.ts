import { fileURLToPath } from 'node:url'
import { defaultNuvaPublicConfig } from './app/types/config'

export default defineNuxtConfig({
  srcDir: 'app',
  experimental: {
    typedPages: true,
  },
  typescript: {
    nodeTsConfig: {
      compilerOptions: {
        types: ['node'],
      },
    },
  },
  modules: [
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
  ],
  css: ['~/assets/css/tailwind.css'],
  imports: {
    dirs: [
      'utils/http',
    ],
  },
  devtools: { enabled: true },
  alias: {
    '#nuva-core': fileURLToPath(new URL('./', import.meta.url)),
  },
  runtimeConfig: {
    public: {
      nuva: defaultNuvaPublicConfig,
    },
  },
  compatibilityDate: '2026-05-30',
})
