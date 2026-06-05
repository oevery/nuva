import type { NuvaAuthConfig, NuvaAuthModuleOptions } from '../../config'
import { addImports, addPlugin, addServerHandler, addServerPlugin, addServerTemplate, addTemplate, createResolver, defineNuxtModule, installModule } from '@nuxt/kit'
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
    name: '@oevery/nuva-better-auth',
    configKey: 'nuvaAuth',
  },
  defaults: {},
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const authOptions = defu({
      adapter: 'better-auth',
      enabled: true,
      provider: 'better-auth',
    }, options) as NuvaAuthModuleOptions & { adapter: string }

    await installModule(resolver.resolve('../auth/module'), authOptions)

    const currentPublicConfig = nuxt.options.runtimeConfig.public.nuva || {}
    const authConfig = defu(currentPublicConfig.auth || {}, authOptions, defaultNuvaAuthConfig) as NuvaAuthConfig
    const serverAuthImport = authConfig.betterAuth.serverAuthImport
    const basePath = normalizeBasePath(authConfig.betterAuth.basePath)

    addImports([
      {
        name: 'useBetterAuthClient',
        from: resolver.resolve('./runtime/composables/useBetterAuthClient'),
      },
    ])

    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
    })

    if (!serverAuthImport) {
      throw new Error('nuvaAuth.betterAuth.serverAuthImport is required when using @oevery/nuva/better-auth')
    }

    const handler = addServerTemplate({
      filename: '#nuva-auth/better-auth-handler.mjs',
      getContents: () => `import { createError, defineEventHandler, toWebRequest } from 'h3'

const authModulePromise = import('${serverAuthImport}')

function resolveBetterAuthInstance(authModule) {
  return authModule.auth || authModule.default?.auth || authModule.default
}

export default defineEventHandler(async (event) => {
  const authModule = await authModulePromise
  const auth = resolveBetterAuthInstance(authModule)

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

    const serverAdapterPlugin = addTemplate({
      filename: 'nuva/better-auth-server-adapter.mjs',
      write: true,
      getContents: () => `import { defineNitroPlugin } from 'nitro/runtime'
import { registerBetterAuthServerAdapter } from '${resolver.resolve('./runtime/server-adapter')}'

const authModulePromise = import('${serverAuthImport}')

function resolveBetterAuthInstance(authModule) {
  return authModule.auth || authModule.default?.auth || authModule.default
}

export default defineNitroPlugin(async () => {
  const authModule = await authModulePromise
  const auth = resolveBetterAuthInstance(authModule)

  if (auth) {
    registerBetterAuthServerAdapter({ auth, basePath: '${basePath}' })
  }
})
`,
    })

    addServerPlugin(serverAdapterPlugin.dst)
  },
})
