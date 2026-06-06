import type { NuvaAuthConfig, NuvaConfigFile, NuvaModuleOptions, NuvaRemoteCapabilityOptions } from '../../config'
import process from 'node:process'
import { addImports, addPluginTemplate, createResolver, defineNuxtModule, importModule, resolvePath } from '@nuxt/kit'
import { defu } from 'defu'
import { defaultNuvaAuthConfig, defaultNuvaPublicConfig, serializeNuvaRemoteMap, serializeNuvaRemoteRequest } from '../../config'

async function loadNuvaConfig(rootDir: string, configFile = 'nuva.config.ts') {
  const resolvedPath = await resolvePath(configFile, {
    cwd: rootDir,
    fallbackToOriginal: true,
  })

  if (!resolvedPath || resolvedPath === configFile) {
    return null
  }

  return importModule<NuvaConfigFile>(resolvedPath, {
    interopDefault: true,
  })
}

function normalizeBasePath(basePath: string) {
  const trimmed = basePath.trim()

  if (!trimmed) {
    return defaultNuvaAuthConfig.betterAuth.basePath
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '')
}

function normalizeRemoteOptions(remote: NuvaRemoteCapabilityOptions) {
  const request = remote.request || null

  if (request && !request.method) {
    request.method = 'GET'
  }

  remote.request = request
}

function normalizeBetterAuthConfig(authConfig: NuvaAuthConfig) {
  const { betterAuth, permission } = authConfig
  const usesBetterAuthOrganizationConfig = betterAuth.organization.enabled || betterAuth.organization.hasPermission || betterAuth.organization.dynamicAccessControl

  if (usesBetterAuthOrganizationConfig) {
    authConfig.provider = 'better-auth'
    betterAuth.organization.enabled = true
    permission.source = 'adapter'
  }
}

function normalizeAuthConfig(authConfig: NuvaAuthConfig) {
  authConfig.betterAuth.basePath = normalizeBasePath(authConfig.betterAuth.basePath)

  normalizeBetterAuthConfig(authConfig)
}

function hasRuntimeRemoteRequest(request: string) {
  return !!request
}

function assertAuthSecurityConfig(authConfig: NuvaAuthConfig) {
  if (process.env.NODE_ENV !== 'production' || !authConfig.enabled) {
    return
  }

  if (authConfig.permission.source === 'local') {
    console.warn('[nuva/auth] auth.permission.source is "local" in production. Use remote, adapter, or ensure static permissions are intentional.')
  }

  if (authConfig.user.remote.request.includes('/demo-auth') || authConfig.permission.remote.request.includes('/demo-auth') || authConfig.accessMenu.remote.request.includes('/demo-auth')) {
    throw new Error('[nuva/auth] demo auth endpoints cannot be used in production. Replace /demo-auth endpoints with real authentication and permission APIs before deployment.')
  }
}

function createRuntimeRemoteConfig(remote: NuvaRemoteCapabilityOptions) {
  return {
    request: serializeNuvaRemoteRequest(remote.request),
    resolver: false,
    map: serializeNuvaRemoteMap(remote.map),
    cacheMaxAge: remote.cacheMaxAge || 0,
  }
}

async function resolveResolverImport(rootDir: string, explicitPath: string | undefined, fallbackPath: string) {
  const target = explicitPath || fallbackPath
  const resolved = await resolvePath(target, {
    cwd: rootDir,
    fallbackToOriginal: true,
  })

  if (!resolved || resolved === target) {
    return ''
  }

  return resolved
}

export default defineNuxtModule<NuvaModuleOptions>({
  meta: {
    name: '@oevery/nuva-config',
    configKey: 'nuva',
  },
  defaults: {
    configFile: 'nuva.config.ts',
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const fileConfig = await loadNuvaConfig(nuxt.options.rootDir, options.configFile || 'nuva.config.ts')
    const currentPublicConfig = nuxt.options.runtimeConfig.public.nuva || {}
    const authOverride = (nuxt.options as typeof nuxt.options & {
      nuvaAuth?: NuvaModuleOptions['auth']
    }).nuvaAuth
    const currentAuthConfig = currentPublicConfig.auth as Partial<NuvaAuthConfig> | undefined
    const authOptions = defu(
      authOverride || {},
      options.auth || {},
      fileConfig?.auth || {},
      currentAuthConfig || {},
      defaultNuvaAuthConfig,
    ) as NuvaAuthConfig & {
      user: Omit<NuvaAuthConfig['user'], 'remote'> & { remote: NuvaRemoteCapabilityOptions }
      permission: Omit<NuvaAuthConfig['permission'], 'remote'> & { remote: NuvaRemoteCapabilityOptions }
      accessMenu: Omit<NuvaAuthConfig['accessMenu'], 'remote'> & { remote: NuvaRemoteCapabilityOptions }
    }

    normalizeRemoteOptions(authOptions.user.remote)
    normalizeRemoteOptions(authOptions.permission.remote)
    normalizeRemoteOptions(authOptions.accessMenu.remote)

    const authConfig = {
      ...authOptions,
      user: {
        ...authOptions.user,
        remote: createRuntimeRemoteConfig(authOptions.user.remote),
      },
      permission: {
        ...authOptions.permission,
        remote: createRuntimeRemoteConfig(authOptions.permission.remote),
      },
      accessMenu: {
        ...authOptions.accessMenu,
        remote: createRuntimeRemoteConfig(authOptions.accessMenu.remote),
      },
    } satisfies NuvaAuthConfig

    authConfig.publicRoutes = Array.from(new Set([
      authConfig.loginPath,
      ...(authConfig.publicRoutes || []),
    ]))

    const userResolverImport = await resolveResolverImport(
      nuxt.options.rootDir,
      options.resolvers?.user || fileConfig?.resolvers?.user,
      'app/nuva/user-resolver.ts',
    )
    const permissionResolverImport = await resolveResolverImport(
      nuxt.options.rootDir,
      options.resolvers?.permission || fileConfig?.resolvers?.permission,
      'app/nuva/permission-resolver.ts',
    )
    const menuResolverImport = await resolveResolverImport(
      nuxt.options.rootDir,
      options.resolvers?.menu || fileConfig?.resolvers?.menu,
      'app/nuva/menu-resolver.ts',
    )

    normalizeAuthConfig(authConfig)
    assertAuthSecurityConfig(authConfig)

    const hasPermissionRequest = hasRuntimeRemoteRequest(authConfig.permission.remote.request)
    const hasMenuRequest = hasRuntimeRemoteRequest(authConfig.accessMenu.remote.request)

    authConfig.user.remote.resolver = !!userResolverImport
    authConfig.permission.remote.resolver = !!permissionResolverImport
      && authConfig.permission.source === 'remote'
      && (hasPermissionRequest || !!permissionResolverImport)
    authConfig.accessMenu.remote.resolver = !!menuResolverImport
      && authConfig.accessMenu.source === 'remote'
      && (hasMenuRequest || !!menuResolverImport)

    const apiConfig = defu(
      options.api || {},
      fileConfig?.api || {},
      currentPublicConfig.api || {},
      defaultNuvaPublicConfig.api,
    )

    const publicConfig = defu({
      api: apiConfig,
      auth: authConfig,
    }, currentPublicConfig, defaultNuvaPublicConfig)
    publicConfig.auth.publicRoutes = Array.from(new Set([
      publicConfig.auth.loginPath,
      ...(publicConfig.auth.publicRoutes || []),
    ]))

    nuxt.options.runtimeConfig.public.nuva = publicConfig

    addPluginTemplate({
      filename: 'nuva/resolvers.plugin.mjs',
      getContents: () => {
        const lines = [
          userResolverImport ? `import userResolver from ${JSON.stringify(userResolverImport)}` : 'const userResolver = null',
          permissionResolverImport ? `import permissionResolver from ${JSON.stringify(permissionResolverImport)}` : 'const permissionResolver = null',
          menuResolverImport ? `import menuResolver from ${JSON.stringify(menuResolverImport)}` : 'const menuResolver = null',
          '',
          'export default defineNuxtPlugin(() => {',
          '  const resolvers = useState(\'nuva:auth:resolvers\', () => ({',
          '    user: userResolver,',
          '    permission: permissionResolver,',
          '    menu: menuResolver,',
          '  }))',
          '',
          '  resolvers.value = {',
          '    user: userResolver,',
          '    permission: permissionResolver,',
          '    menu: menuResolver,',
          '  }',
          '})',
        ]

        return `${lines.join('\n')}\n`
      },
    })

    addImports([
      {
        name: 'useNuvaConfig',
        from: resolver.resolve('./runtime/composables/useNuvaConfig'),
      },
    ])
  },
})
