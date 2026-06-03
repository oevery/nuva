import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defaultNuvaPublicConfig } from './config'

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
    '@oevery/nuva/base',
  ],
  css: ['#nuva-core/app/assets/css/nuva-core.css'],
  vite: {
    plugins: [tailwindcss()],
  },
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
