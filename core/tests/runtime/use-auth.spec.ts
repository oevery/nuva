import { defaultNuvaPublicConfig } from '../../config'
import { useAuth } from '../../modules/auth/runtime/composables/useAuth'

const tokenAuth = vi.hoisted(() => ({
  user: { value: null as { id: string } | null },
  ready: { value: false },
  isAuthenticated: { value: false },
  logout: vi.fn(),
}))

const betterAuthSession = vi.hoisted(() => ({
  user: { value: null as { id: string } | null },
  ready: { value: false },
  isAuthenticated: { value: false },
  logout: vi.fn(),
}))

const redirect = vi.hoisted(() => ({
  toLogin: vi.fn(),
  afterLogin: vi.fn(),
}))

vi.mock('../../modules/auth/runtime/internal/useTokenAuth', () => ({
  useTokenAuth: () => tokenAuth,
}))

vi.mock('../../modules/auth/runtime/adapters/registry', () => ({
  useAuthAdapter: (name: string) => name === 'better-auth'
    ? {
        name: 'better-auth',
        user: betterAuthSession.user,
        ready: betterAuthSession.ready,
        isAuthenticated: betterAuthSession.isAuthenticated,
        logout: betterAuthSession.logout,
      }
    : {
        name: 'token',
        user: tokenAuth.user,
        ready: tokenAuth.ready,
        isAuthenticated: tokenAuth.isAuthenticated,
        logout: tokenAuth.logout,
      },
}))

vi.mock('../../modules/auth/runtime/internal/redirect', () => ({
  useAuthRedirect: () => redirect,
}))

describe('use auth', () => {
  beforeEach(() => {
    clearNuxtState()
    tokenAuth.user.value = { id: 'token-user' }
    tokenAuth.ready.value = true
    tokenAuth.isAuthenticated.value = true
    tokenAuth.logout.mockReset()
    betterAuthSession.user.value = { id: 'better-auth-user' }
    betterAuthSession.ready.value = true
    betterAuthSession.isAuthenticated.value = true
    betterAuthSession.logout.mockReset()
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
  })

  it('uses token auth state and logout in token provider mode', async () => {
    const auth = useAuth<{ id: string }>()

    expect(auth.provider).toBe('token')
    expect(auth.user.value).toEqual({ id: 'token-user' })
    expect(auth.ready.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(true)

    await auth.logout()

    expect(tokenAuth.logout).toHaveBeenCalledTimes(1)
    expect(betterAuthSession.logout).not.toHaveBeenCalled()
  })

  it('uses better-auth adapter state in better-auth provider mode', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        provider: 'better-auth',
      },
    }

    const auth = useAuth<{ id: string }>()

    expect(auth.provider).toBe('better-auth')
    expect(auth.user.value).toEqual({ id: 'better-auth-user' })
    expect(auth.ready.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(true)

    await auth.logout()

    expect(betterAuthSession.logout).toHaveBeenCalledTimes(1)
    expect(tokenAuth.logout).not.toHaveBeenCalled()
  })
})
