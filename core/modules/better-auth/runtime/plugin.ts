import { registerBetterAuthAdapter } from './adapter'

export default defineNuxtPlugin(() => {
  registerBetterAuthAdapter()
})
