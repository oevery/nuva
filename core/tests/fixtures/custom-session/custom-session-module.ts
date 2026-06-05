import { defineNuxtModule, installModule } from '@nuxt/kit'
import authModule from '../../../modules/auth/module'

export default defineNuxtModule({
  meta: {
    name: 'custom-session-auth',
  },
  async setup() {
    await installModule(authModule, {
      adapter: 'custom-session',
      enabled: true,
      provider: 'custom-session',
      global: true,
      loginPath: '/login',
      publicRoutes: ['/login'],
      permission: {
        provider: 'adapter',
        forbiddenPath: '/403',
      },
    } as Record<string, unknown>)
  },
})
