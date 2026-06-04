const kit = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPluginTemplate: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler: vi.fn(),
  addServerTemplate: vi.fn(() => ({ filename: '#nuva-auth/better-auth-handler.mjs' })),
  createResolver: vi.fn(() => ({
    resolve: (path: string) => path,
  })),
  defineNuxtModule: vi.fn((module: unknown) => module),
  importModule: vi.fn(),
  installModule: vi.fn(),
  resolvePath: vi.fn(async (path: string) => path),
}))

vi.mock('@nuxt/kit', () => kit)

describe('nuxt module setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    kit.addServerTemplate.mockReturnValue({ filename: '#nuva-auth/better-auth-handler.mjs' })
    kit.resolvePath.mockImplementation(async (path: string) => path)
  })

  it('normalizes nuva runtime auth config without duplicating public routes', async () => {
    const nuvaModule = (await import('../../modules/nuva/module')).default as any
    const nuxt = {
      options: {
        rootDir: '/fixture',
        runtimeConfig: {
          public: {
            nuva: {},
          },
        },
      },
    }

    await nuvaModule.setup({
      auth: {
        preset: 'remote',
        loginPath: '/sign-in',
        publicRoutes: ['/sign-in', '/public', '/public'],
        permission: {
          provider: 'endpoint',
          remote: {
            profileEndpoint: '/api/profile',
            permissionEndpoint: '/api/permission',
          },
          betterAuth: {
            hasPermission: true,
          },
        },
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.enabled).toBe(true)
    expect(auth.loginPath).toBe('/sign-in')
    expect(auth.publicRoutes).toContain('/sign-in')
    expect(auth.publicRoutes).toContain('/public')
    expect(new Set(auth.publicRoutes).size).toBe(auth.publicRoutes.length)
    expect(auth.permission.source).toBe('remote')
    expect(auth.permission.provider).toBe('endpoint')
    expect(auth.permission.remote.profile).toBe('')
    expect(auth.permission.remote.permission).toContain('/api/permission')
    expect(auth.permission.betterAuth.organization).toBe(true)
    expect(kit.addPluginTemplate).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'nuva/resolvers.plugin.mjs',
    }))
    expect(kit.addImports).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'useNuvaConfig' }),
    ]))
  })

  it('installs nuva config module and registers auth imports and middleware', async () => {
    const authModule = (await import('../../modules/auth/module')).default as any
    const nuxt = {
      options: {
        runtimeConfig: {
          public: {
            nuva: {
              auth: {
                mode: 'frontend',
              },
            },
          },
        },
      },
    }

    await authModule.setup({ enabled: true }, nuxt)

    expect(kit.installModule).toHaveBeenCalledWith('../nuva/module', {
      auth: { enabled: true },
    })
    expect(kit.addImports).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'useAuth' }),
      expect.objectContaining({ name: 'useBetterAuth' }),
      expect.objectContaining({ name: 'usePermission' }),
      expect.objectContaining({ name: 'useBetterAuthSession' }),
    ]))
    expect(kit.addRouteMiddleware).toHaveBeenCalledWith({
      name: 'auth',
      path: './runtime/middleware/auth',
      global: true,
    })
    expect(kit.addServerTemplate).not.toHaveBeenCalled()
    expect(kit.addServerHandler).not.toHaveBeenCalled()
  })

  it('registers better-auth wildcard handler in fullstack mode', async () => {
    const authModule = (await import('../../modules/auth/module')).default as any
    const nuxt = {
      options: {
        runtimeConfig: {
          public: {
            nuva: {},
          },
        },
      },
    }

    await authModule.setup({
      mode: 'fullstack',
      betterAuth: {
        basePath: 'api/auth///',
        serverAuthImport: '~~/server/utils/better-auth',
      },
    }, nuxt)

    const template = kit.addServerTemplate.mock.calls[0]?.[0]

    expect(template.filename).toBe('#nuva-auth/better-auth-handler.mjs')
    expect(template.getContents()).toContain('import(\'~~/server/utils/better-auth\')')
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      route: '/api/auth/**',
      handler: '#nuva-auth/better-auth-handler.mjs',
    })
  })
})
