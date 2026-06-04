import type { NuvaAuthConfig, NuvaConfigFile, NuvaModuleOptions, NuvaPermissionConfig, NuvaPermissionProvider, NuvaPermissionSource, NuvaRemoteAccessMenuOptions, NuvaRemotePermissionOptions, NuvaRemoteRequestConfig } from '../../config'
import { addImports, addPluginTemplate, createResolver, defineNuxtModule, importModule, resolvePath } from '@nuxt/kit'
import { defu } from 'defu'
import { defaultNuvaAuthConfig, defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'

function toRequestConfig(url: string): NuvaRemoteRequestConfig | null {
  return url ? { url, method: 'GET' } : null
}

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

function isRemotePermissionSource(source: NuvaPermissionSource) {
  return source === 'remote' || source === 'hybrid'
}

function normalizeBasePath(basePath: string) {
  const trimmed = basePath.trim()

  if (!trimmed) {
    return defaultNuvaAuthConfig.betterAuth.basePath
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '')
}

function normalizeRemoteOptions(remote: NuvaRemotePermissionOptions) {
  const profile = remote.profile || toRequestConfig(remote.profileEndpoint)
  const permission = remote.permission || toRequestConfig(remote.permissionEndpoint)

  if (profile && !profile.method) {
    profile.method = 'GET'
  }

  if (permission && !permission.method) {
    permission.method = 'GET'
  }

  remote.profile = profile
  remote.permission = permission
}

function normalizeRemoteAccessMenuOptions(remote: NuvaRemoteAccessMenuOptions) {
  const menu = remote.menu || toRequestConfig(remote.menuEndpoint)

  if (menu && !menu.method) {
    menu.method = 'GET'
  }

  remote.menu = menu
}

function normalizePermissionConfig(permission: NuvaPermissionConfig) {
  const source = resolvePermissionSource(permission.provider) || permission.source
  permission.source = source
  permission.provider = permission.provider || resolvePermissionProvider(source)

  if (permission.provider === 'profile') {
    permission.remote.permissionEndpoint = ''
    permission.remote.permission = ''
  }

  if (permission.provider === 'endpoint') {
    permission.remote.profileEndpoint = ''
    permission.remote.profile = ''
  }

  if (permission.betterAuth.hasPermission || permission.betterAuth.dynamicAccessControl) {
    permission.betterAuth.organization = true
  }
}

function normalizeAuthConfig(authConfig: NuvaAuthConfig) {
  normalizePermissionConfig(authConfig.permission)
  authConfig.betterAuth.basePath = normalizeBasePath(authConfig.betterAuth.basePath)

  if (authConfig.preset && authConfig.enabled === defaultNuvaAuthConfig.enabled) {
    authConfig.enabled = true
  }

  if (authConfig.provider === 'better-auth') {
    authConfig.mode = 'fullstack'
  }
}

function createRuntimeRemoteConfig(remote: NuvaRemotePermissionOptions) {
  return {
    profileEndpoint: remote.profileEndpoint || '',
    permissionEndpoint: remote.permissionEndpoint || '',
    profile: serializeNuvaRemoteRequest(remote.profile),
    permission: serializeNuvaRemoteRequest(remote.permission),
    profileResolver: false,
    permissionResolver: false,
    cacheMaxAge: remote.cacheMaxAge || 0,
  }
}

function createRuntimeRemoteAccessMenuConfig(remote: NuvaRemoteAccessMenuOptions) {
  return {
    menuEndpoint: remote.menuEndpoint || '',
    menu: serializeNuvaRemoteRequest(remote.menu),
    menuResolver: false,
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
      permission: Omit<NuvaPermissionConfig, 'remote'> & {
        remote: NuvaRemotePermissionOptions
      }
      accessMenu: Omit<NuvaAuthConfig['accessMenu'], 'remote'> & {
        remote: NuvaRemoteAccessMenuOptions
      }
    }

    normalizeRemoteOptions(authOptions.permission.remote)
    normalizeRemoteAccessMenuOptions(authOptions.accessMenu.remote)

    const authConfig = {
      ...authOptions,
      permission: {
        ...authOptions.permission,
        remote: createRuntimeRemoteConfig(authOptions.permission.remote),
      },
      accessMenu: {
        ...authOptions.accessMenu,
        remote: createRuntimeRemoteAccessMenuConfig(authOptions.accessMenu.remote),
      },
    } satisfies NuvaAuthConfig

    authConfig.publicRoutes = Array.from(new Set([
      authConfig.loginPath,
      ...(authConfig.publicRoutes || []),
    ]))

    const profileResolverImport = await resolveResolverImport(
      nuxt.options.rootDir,
      options.resolvers?.profile || fileConfig?.resolvers?.profile,
      'app/nuva/profile-resolver.ts',
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

    authConfig.permission.remote.profileResolver = !!profileResolverImport
      && isRemotePermissionSource(authConfig.permission.source)
      && authConfig.permission.provider !== 'endpoint'
    authConfig.permission.remote.permissionResolver = !!permissionResolverImport
      && isRemotePermissionSource(authConfig.permission.source)
      && authConfig.permission.provider !== 'profile'
    authConfig.accessMenu.remote.menuResolver = !!menuResolverImport
      && authConfig.accessMenu.provider === 'endpoint'

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
          profileResolverImport ? `import profileResolver from ${JSON.stringify(profileResolverImport)}` : 'const profileResolver = null',
          permissionResolverImport ? `import permissionResolver from ${JSON.stringify(permissionResolverImport)}` : 'const permissionResolver = null',
          menuResolverImport ? `import menuResolver from ${JSON.stringify(menuResolverImport)}` : 'const menuResolver = null',
          '',
          'export default defineNuxtPlugin(() => {',
          '  const resolvers = useState(\'nuva:auth:resolvers\', () => ({',
          '    profile: profileResolver,',
          '    permission: permissionResolver,',
          '    menu: menuResolver,',
          '  }))',
          '',
          '  resolvers.value = {',
          '    profile: profileResolver,',
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
