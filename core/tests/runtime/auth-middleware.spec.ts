import { defaultNuvaPublicConfig } from '../../config'
import { createAuthMiddleware } from '../../modules/auth/runtime/utils/middleware'

const route = reactive({
  path: '/protected',
  fullPath: '/protected',
  meta: {} as Record<string, unknown>,
})

const tokenAuth = {
  ensureUser: vi.fn(async () => null),
  isAuthenticated: ref(false),
}

const permission = {
  ensure: vi.fn(async () => null),
  hasRole: vi.fn(() => true),
  hasScope: vi.fn(() => true),
  anyAsync: vi.fn(async () => true),
  allAsync: vi.fn(async () => true),
}

const redirects = {
  toLogin: vi.fn(() => ({ path: '/login', query: { redirect: '/protected' } })),
}

const runtimeConfig = {
  public: {
    nuva: {
      ...defaultNuvaPublicConfig,
      auth: {
        ...defaultNuvaPublicConfig.auth,
        enabled: true,
        global: true,
        publicRoutes: ['/login', '/public'],
        permission: {
          ...defaultNuvaPublicConfig.auth.permission,
          source: 'remote' as const,
          forbiddenPath: '/403',
        },
      },
    },
  },
}

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn((target: unknown) => target),
}))

mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('../../modules/auth/runtime/composables/useTokenAuth', () => ({
  useTokenAuth: () => tokenAuth,
}))

vi.mock('../../modules/auth/runtime/composables/usePermission', () => ({
  usePermission: () => permission,
}))

vi.mock('../../modules/auth/runtime/utils/redirect', async () => {
  const actual = await vi.importActual<typeof import('../../modules/auth/runtime/utils/redirect')>('../../modules/auth/runtime/utils/redirect')
  return {
    ...actual,
    useAuthRedirect: () => redirects,
  }
})

describe('auth middleware', () => {
  beforeEach(() => {
    useRuntimeConfig().public.nuva = structuredClone(runtimeConfig.public.nuva)
    route.path = '/protected'
    route.fullPath = '/protected'
    route.meta = {}
    tokenAuth.isAuthenticated.value = false
    tokenAuth.ensureUser.mockClear()
    permission.ensure.mockClear()
    permission.hasRole.mockReset().mockReturnValue(true)
    permission.hasScope.mockReset().mockReturnValue(true)
    permission.anyAsync.mockReset().mockResolvedValue(true)
    permission.allAsync.mockReset().mockResolvedValue(true)
    redirects.toLogin.mockClear()
    navigateToMock.mockClear()
  })

  it('redirects unauthenticated users to login for protected routes', async () => {
    const middleware = createAuthMiddleware()
    const result = await middleware(route as any, {} as any)

    expect(redirects.toLogin).toHaveBeenCalled()
    expect(result).toEqual({ path: '/login', query: { redirect: '/protected' } })
  })

  it('allows configured public routes without auth', async () => {
    route.path = '/public'
    route.fullPath = '/public'

    const middleware = createAuthMiddleware()
    const result = await middleware(route as any, {} as any)

    expect(result).toBeUndefined()
    expect(tokenAuth.ensureUser).not.toHaveBeenCalled()
  })

  it('allows authenticated users through role and permission checks', async () => {
    tokenAuth.isAuthenticated.value = true
    route.meta = {
      auth: {
        roles: ['admin'],
        permissions: ['dashboard:view'],
      },
    }

    const middleware = createAuthMiddleware()
    const result = await middleware(route as any, {} as any)

    expect(result).toBeUndefined()
    expect(tokenAuth.ensureUser).toHaveBeenCalled()
    expect(permission.ensure).toHaveBeenCalled()
    expect(permission.hasRole).toHaveBeenCalledWith(['admin'], 'any')
    expect(permission.allAsync).toHaveBeenCalledWith(['dashboard:view'])
  })

  it('redirects to forbidden page when permission checks fail', async () => {
    tokenAuth.isAuthenticated.value = true
    route.meta = {
      auth: {
        permissions: ['dashboard:view'],
      },
    }
    permission.allAsync.mockResolvedValue(false)

    const middleware = createAuthMiddleware()
    await middleware(route as any, {} as any)

    expect(navigateToMock).toHaveBeenCalledWith('/403')
  })
})
