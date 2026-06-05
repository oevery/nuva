import { defineNuvaConfig } from '@oevery/nuva/config'

export default defineNuvaConfig({
  auth: {
    provider: 'token',
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
    accessMenu: {
      provider: 'endpoint',
      remote: {
        menu: {
          url: '/demo-auth/menus',
        },
      },
    },
  },
})
