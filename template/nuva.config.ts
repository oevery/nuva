import { defineNuvaConfig } from '@oevery/nuva/config'

export default defineNuvaConfig({
  api: {
    pagination: {
      pageField: 'pageNum',
      pageSizeField: 'pageSize',
      listKey: 'list',
      totalKey: 'total',
      cleanParams: true,
    },
  },
  auth: {
    provider: 'token',
    loginPath: '/login',
    homePath: '/',
    redirectQuery: 'redirect',
    global: true,
    publicRoutes: ['/login'],
    user: {
      remote: {
        request: {
          url: '/demo-auth/me',
        },
        cacheMaxAge: 30_000,
      },
    },
    permission: {
      source: 'remote',
      forbiddenPath: '/403',
      permissionMode: 'all',
      roleMode: 'any',
      remote: {
        request: {
          url: '/demo-auth/me',
        },
        map: {
          roles: 'roles',
          permissions: 'permissions',
          scope: 'scope',
          dataAccess: 'dataAccess',
        },
        cacheMaxAge: 0,
      },
    },
    accessMenu: {
      source: 'remote',
      remote: {
        request: {
          url: '/demo-auth/menus',
        },
      },
    },
  },
})
