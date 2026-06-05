import type { NuvaAuthConfig, NuvaAuthModuleOptions, NuvaPermissionConfig, NuvaPermissionProvider, NuvaPermissionSource, NuvaPublicConfig } from '../../config'
import { addImports, addRouteMiddleware, createResolver, defineNuxtModule, installModule } from '@nuxt/kit'
import { defu } from 'defu'
import { defaultNuvaAuthConfig, defaultNuvaPublicConfig } from '../../config'

function resolvePermissionSource(provider?: NuvaPermissionProvider): NuvaPermissionSource | undefined {
  if (!provider) {
    return
  }

  if (provider === 'profile' || provider === 'endpoint' || provider === 'remote') {
    return 'remote'
  }

  return provider
}

function resolvePermissionProvider(source: NuvaPermissionSource): NuvaPermissionProvider {
  return source === 'remote' ? 'profile' : source
}

function normalizePermissionConfig(permission: NuvaPermissionConfig) {
  const source = resolvePermissionSource(permission.provider) || permission.source
  permission.source = source
  permission.provider = permission.provider || resolvePermissionProvider(source)
}

export default defineNuxtModule<NuvaAuthModuleOptions>({
  meta: {
    name: '@oevery/nuva-auth',
    configKey: 'nuvaAuth',
  },
  defaults: {},
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const { adapter, ...runtimeAuthOptions } = options as NuvaAuthModuleOptions & { adapter?: string }
    const requestedProvider = runtimeAuthOptions.provider

    await installModule(resolver.resolve('../nuva/module'), {
      auth: defu(runtimeAuthOptions, { enabled: true }),
    })
    const currentPublicConfig = (nuxt.options.runtimeConfig.public.nuva || {}) as Partial<NuvaPublicConfig>
    const authConfig = defu({ enabled: true }, runtimeAuthOptions, currentPublicConfig.auth || {}, defaultNuvaAuthConfig) as NuvaAuthConfig
    normalizePermissionConfig(authConfig.permission)
    authConfig.publicRoutes = Array.from(new Set([
      authConfig.loginPath,
      ...(authConfig.publicRoutes || []),
    ]))
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).nuva = {
      ...defaultNuvaPublicConfig,
      ...currentPublicConfig,
      auth: authConfig,
    } satisfies NuvaPublicConfig

    const provider = requestedProvider || authConfig.provider

    if (provider !== 'token' && adapter !== provider) {
      throw new Error(`Nuva auth provider "${provider}" requires its adapter module. Use the provider module instead of @oevery/nuva/auth, or install @oevery/nuva/auth from that adapter module.`)
    }

    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/composables/useAuth'),
      },
      {
        name: 'usePermission',
        from: resolver.resolve('./runtime/composables/usePermission'),
      },
      {
        name: 'useAccessMenu',
        from: resolver.resolve('./runtime/composables/useAccessMenu'),
      },
      {
        name: 'useTokenAuthClient',
        from: resolver.resolve('./runtime/composables/useTokenAuthClient'),
      },
    ])

    addRouteMiddleware({
      name: 'auth',
      path: resolver.resolve('./runtime/middleware/auth'),
      global: true,
    })
  },
})
