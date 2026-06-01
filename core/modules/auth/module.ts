import type { NuvaAuthModuleOptions } from '../../config'
import { addImports, addRouteMiddleware, addServerHandler, addServerTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'
import { defaultNuvaAuthConfig, defaultNuvaPublicConfig } from '../../config'

export default defineNuxtModule<NuvaAuthModuleOptions>({
  meta: {
    name: '@oevery/nuva-auth',
    configKey: 'nuvaAuth',
  },
  defaults: {
    mode: 'frontend',
    loginPath: '/login',
    homePath: '/',
    redirectQuery: 'redirect',
    global: false,
    publicRoutes: ['/login'],
    betterAuth: {
      basePath: '/api/auth',
      serverAuthImport: '~~/server/utils/better-auth',
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const currentPublicConfig = nuxt.options.runtimeConfig.public.nuva || {}
    const authConfig = defu({ ...options, enabled: true }, currentPublicConfig.auth || {}, defaultNuvaAuthConfig)
    const publicConfig = defu({ auth: authConfig }, currentPublicConfig, defaultNuvaPublicConfig)
    const publicRoutes = Array.from(new Set(authConfig.publicRoutes || [authConfig.loginPath]))

    authConfig.publicRoutes = publicRoutes

    nuxt.options.runtimeConfig.public.nuva = publicConfig

    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/composables/useAuth'),
      },
      {
        name: 'useBetterAuth',
        from: resolver.resolve('./runtime/composables/useBetterAuth'),
      },
    ])

    addRouteMiddleware({
      name: 'auth',
      path: resolver.resolve('./runtime/middleware/auth'),
      global: authConfig.global,
    })

    if (authConfig.mode !== 'fullstack') {
      return
    }

    const serverAuthImport = authConfig.betterAuth.serverAuthImport

    if (!serverAuthImport) {
      throw new Error('nuvaAuth.betterAuth.serverAuthImport is required in fullstack mode')
    }

    const handler = addServerTemplate({
      filename: '#nuva-auth/better-auth-handler.mjs',
      getContents: () => `import { createError, defineEventHandler, toWebRequest } from 'h3'

const authModulePromise = import('${serverAuthImport}')

export default defineEventHandler(async (event) => {
  const authModule = await authModulePromise
  const auth = authModule.auth || authModule.default

  if (!auth?.handler) {
    throw createError({ statusCode: 500, statusMessage: 'Better Auth instance is not configured' })
  }

  return auth.handler(toWebRequest(event))
})
`,
    })

    addServerHandler({
      route: `${authConfig.betterAuth.basePath}/**`,
      handler: handler.filename,
    })
  },
})
