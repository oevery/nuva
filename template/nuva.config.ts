import { defineNuvaConfig } from '@oevery/nuva/config'

export default defineNuvaConfig({
  auth: {
    preset: 'remote',
    mode: 'frontend',
    loginPath: '/login',
    homePath: '/',
    redirectQuery: 'redirect',
    global: true,
    publicRoutes: ['/login'],
    permission: {
      provider: 'profile',
      forbiddenPath: '/403',
      permissionMode: 'all',
      roleMode: 'any',
      remote: {
        profile: {
          url: '/demo-auth/me',
        },
        cacheMaxAge: 0,
      },
    },
  },
})
