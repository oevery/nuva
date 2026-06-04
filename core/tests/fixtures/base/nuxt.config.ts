import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('../../../modules/auth/module.ts', import.meta.url)),
  ],
  compatibilityDate: '2026-05-30',
})
