import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../..', import.meta.url))],
  modules: [
    fileURLToPath(new URL('./custom-session-module.ts', import.meta.url)),
  ],
  compatibilityDate: '2026-05-30',
})
