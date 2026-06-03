import type { NuvaAuthConfig, NuvaAuthModuleOptions } from '../../config'
import { addImports, addRouteMiddleware, addServerHandler, addServerTemplate, createResolver, defineNuxtModule, installModule } from '@nuxt/kit'
import { defu } from 'defu'
import { defaultNuvaAuthConfig } from '../../config'

function normalizeBasePath(basePath: string) {
  const trimmed = basePath.trim()

  if (!trimmed) {
    return defaultNuvaAuthConfig.betterAuth.basePath
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '')
}

export default defineNuxtModule<NuvaAuthModuleOptions>({
  meta: {
    name: '@oevery/nuva-auth',
    configKey: 'nuvaAuth',
  },
  defaults: {},
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    await installModule(resolver.resolve('../nuva/module'), {
      auth: options,
    })
    const currentPublicConfig = nuxt.options.runtimeConfig.public.nuva || {}
    const authConfig = defu(options, currentPublicConfig.auth || {}, defaultNuvaAuthConfig) as NuvaAuthConfig

    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/composables/useAuth'),
      },
      {
        name: 'useBetterAuth',
        from: resolver.resolve('./runtime/composables/useBetterAuth'),
      },
      {
        name: 'usePermission',
        from: resolver.resolve('./runtime/composables/usePermission'),
      },
      {
        name: 'useNuvaAuthResolvers',
        from: resolver.resolve('./runtime/composables/useNuvaAuthResolvers'),
      },
      {
        name: 'useBetterAuthSession',
        from: resolver.resolve('./runtime/composables/useBetterAuthSession'),
      },
    ])

    addRouteMiddleware({
      name: 'auth',
      path: resolver.resolve('./runtime/middleware/auth'),
      global: true,
    })

    if (authConfig.mode !== 'fullstack') {
      return
    }

    const serverAuthImport = authConfig.betterAuth.serverAuthImport
    const basePath = normalizeBasePath(authConfig.betterAuth.basePath)

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
      route: `${basePath}/**`,
      handler: handler.filename,
    })
  },
})
