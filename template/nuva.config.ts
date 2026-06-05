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
      source: 'remote',
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
      source: 'remote',
      remote: {
        menu: {
          url: '/demo-auth/menus',
        },
      },
    },
  },
})
