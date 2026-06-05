const kit = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addPluginTemplate: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler: vi.fn(),
  addServerPlugin: vi.fn(),
  addServerTemplate: vi.fn(() => ({ filename: '#nuva-auth/better-auth-handler.mjs' })),
  addTemplate: vi.fn(),
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
    kit.addServerTemplate.mockImplementation((template: { filename: string }) => ({
      filename: template.filename,
    }))
    kit.addTemplate.mockImplementation((template: { filename: string }) => ({
      filename: template.filename,
      dst: `/fixture/.nuxt/${template.filename}`,
    }))
    kit.resolvePath.mockImplementation(async (path: string) => path.includes('custom-menu-resolver')
      ? '/fixture/app/nuva/custom-menu-resolver.ts'
      : path)
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
      resolvers: {
        menu: '~/app/nuva/custom-menu-resolver.ts',
      },
      auth: {
        provider: 'token',
        loginPath: '/sign-in',
        publicRoutes: ['/sign-in', '/public', '/public'],
        permission: {
          provider: 'endpoint',
          remote: {
            profileEndpoint: '/api/profile',
            permissionEndpoint: '/api/permission',
          },
        },
        accessMenu: {
          provider: 'endpoint',
          remote: {
            menuEndpoint: '/api/menus',
          },
        },
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.enabled).toBe(false)
    expect(auth.loginPath).toBe('/sign-in')
    expect(auth.publicRoutes).toContain('/sign-in')
    expect(auth.publicRoutes).toContain('/public')
    expect(new Set(auth.publicRoutes).size).toBe(auth.publicRoutes.length)
    expect(auth.permission.source).toBe('remote')
    expect(auth.permission.provider).toBe('endpoint')
    expect(auth.permission.remote.profile).toBe('')
    expect(auth.permission.remote.permission).toContain('/api/permission')
    expect(auth.accessMenu.provider).toBe('endpoint')
    expect(auth.accessMenu.remote.menu).toContain('/api/menus')
    expect(kit.addPluginTemplate).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'nuva/resolvers.plugin.mjs',
    }))
    const resolverTemplate = kit.addPluginTemplate.mock.calls[0]?.[0]
    expect(resolverTemplate.getContents()).toContain('menuResolver')
    expect(resolverTemplate.getContents()).toContain('menu: menuResolver')
    expect(resolverTemplate.getContents()).not.toContain('accessMenu: menuResolver')
    expect(kit.addImports).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'useNuvaConfig' }),
    ]))
  })

  it('derives better-auth organization permission config', async () => {
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
        provider: 'better-auth',
        betterAuth: {
          organization: {
            hasPermission: true,
          },
        },
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.enabled).toBe(false)
    expect(auth.provider).toBe('better-auth')
    expect(auth.permission.source).toBe('adapter')
    expect(auth.permission.provider).toBe('adapter')
    expect(auth.betterAuth.organization.enabled).toBe(true)
    expect(auth.betterAuth.organization.hasPermission).toBe(true)
  })

  it('keeps better-auth provider session-only when organization is not enabled', async () => {
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
        provider: 'better-auth',
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.provider).toBe('better-auth')
    expect(auth.permission.source).toBe('local')
    expect(auth.permission.provider).toBe('local')
    expect(auth.betterAuth.organization.enabled).toBe(false)
  })

  it('keeps explicit adapter permission source without changing auth provider', async () => {
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
        provider: 'custom-session',
        permission: {
          provider: 'adapter',
        },
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.provider).toBe('custom-session')
    expect(auth.permission.source).toBe('adapter')
    expect(auth.permission.provider).toBe('adapter')
  })

  it('rejects removed legacy permission.betterAuth options', async () => {
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

    await expect(nuvaModule.setup({
      auth: {
        provider: 'token',
        permission: {
          provider: 'endpoint',
          remote: {
            permissionEndpoint: '/api/permission',
          },
          betterAuth: {
            hasPermission: true,
          },
        },
      },
    }, nuxt)).rejects.toThrow('auth.permission.betterAuth has been removed')
  })

  it('rejects demo auth endpoints in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV
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

    process.env.NODE_ENV = 'production'

    try {
      await expect(nuvaModule.setup({
        auth: {
          enabled: true,
          provider: 'token',
          permission: {
            provider: 'profile',
            remote: {
              profileEndpoint: '/demo-auth/me',
            },
          },
        },
      }, nuxt)).rejects.toThrow('demo auth endpoints cannot be used in production')
    }
    finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  it('installs nuva config module and registers auth core imports and middleware', async () => {
    const authModule = (await import('../../modules/auth/module')).default as any
    const nuxt = {
      options: {
        runtimeConfig: {
          public: {
            nuva: {
              auth: {
                provider: 'token',
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
      expect.objectContaining({ name: 'usePermission' }),
      expect.objectContaining({ name: 'useAccessMenu' }),
    ]))
    expect(kit.addRouteMiddleware).toHaveBeenCalledWith({
      name: 'auth',
      path: './runtime/middleware/auth',
      global: true,
    })
    expect(kit.addServerTemplate).not.toHaveBeenCalled()
    expect(kit.addServerHandler).not.toHaveBeenCalled()
  })

  it('fails fast when better-auth provider is used without the better-auth module', async () => {
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

    await expect(authModule.setup({
      provider: 'better-auth',
    }, nuxt)).rejects.toThrow('adapter module')
  })

  it('writes auth module options into public runtime config', async () => {
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
      adapter: 'custom-session',
      provider: 'custom-session',
      global: true,
      permission: {
        provider: 'adapter',
      },
    }, nuxt)

    const auth = nuxt.options.runtimeConfig.public.nuva.auth

    expect(auth.enabled).toBe(true)
    expect(auth.provider).toBe('custom-session')
    expect(auth.global).toBe(true)
    expect(auth.permission.provider).toBe('adapter')
    expect(auth.permission.source).toBe('adapter')
  })

  it('installs auth core and registers better-auth imports, plugin and wildcard handler', async () => {
    const betterAuthModule = (await import('../../modules/better-auth/module')).default as any
    const nuxt = {
      options: {
        runtimeConfig: {
          public: {
            nuva: {},
          },
        },
      },
    }

    await betterAuthModule.setup({
      betterAuth: {
        basePath: 'api/auth///',
        serverAuthImport: '~~/server/utils/better-auth',
      },
    }, nuxt)

    expect(kit.installModule).toHaveBeenCalledWith('../auth/module', expect.objectContaining({
      adapter: 'better-auth',
      enabled: true,
      provider: 'better-auth',
    }))
    expect(kit.addImports).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'useBetterAuthClient' }),
    ]))
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: './runtime/plugin',
    })

    const template = kit.addServerTemplate.mock.calls[0]?.[0]

    expect(template.filename).toBe('#nuva-auth/better-auth-handler.mjs')
    expect(template.getContents()).toContain('import(\'~~/server/utils/better-auth\')')
    expect(template.getContents()).toContain('authModule.default?.auth')
    expect(kit.addServerHandler).toHaveBeenCalledWith({
      route: '/api/auth/**',
      handler: '#nuva-auth/better-auth-handler.mjs',
    })
    const serverAdapterTemplate = kit.addTemplate.mock.calls[0]?.[0]

    expect(serverAdapterTemplate.filename).toBe('nuva/better-auth-server-adapter.mjs')
    expect(serverAdapterTemplate.getContents()).toContain('registerBetterAuthServerAdapter')
    expect(kit.addServerPlugin).toHaveBeenCalledWith('/fixture/.nuxt/nuva/better-auth-server-adapter.mjs')
  })
})
