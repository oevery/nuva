import { defaultNuvaPublicConfig } from '../../config'
import { useAuth } from '../../modules/auth/runtime/composables/useAuth'

const tokenAuth = vi.hoisted(() => ({
  user: { value: null as { id: string } | null },
  ready: { value: false },
  isAuthenticated: { value: false },
  loginWithToken: vi.fn(),
  logout: vi.fn(),
}))

const betterAuthSession = vi.hoisted(() => ({
  user: { value: null as { id: string } | null },
  ready: { value: false },
  isAuthenticated: { value: false },
  logout: vi.fn(),
}))

const betterAuthClient = vi.hoisted(() => ({
  signIn: vi.fn(),
}))

const permission = vi.hoisted(() => ({
  can: vi.fn(),
}))

const redirect = vi.hoisted(() => ({
  toLogin: vi.fn(),
  afterLogin: vi.fn(),
}))

vi.mock('../../modules/auth/runtime/composables/useTokenAuth', () => ({
  useTokenAuth: () => tokenAuth,
}))

vi.mock('../../modules/auth/runtime/composables/useBetterAuthSession', () => ({
  useBetterAuthSession: () => betterAuthSession,
}))

vi.mock('../../modules/auth/runtime/composables/useBetterAuth', () => ({
  useBetterAuth: () => betterAuthClient,
}))

vi.mock('../../modules/auth/runtime/composables/usePermission', () => ({
  usePermission: () => permission,
}))

vi.mock('../../modules/auth/runtime/utils/redirect', () => ({
  useAuthRedirect: () => redirect,
}))

describe('use auth', () => {
  beforeEach(() => {
    clearNuxtState()
    tokenAuth.user.value = { id: 'token-user' }
    tokenAuth.ready.value = true
    tokenAuth.isAuthenticated.value = true
    tokenAuth.loginWithToken.mockReset()
    tokenAuth.logout.mockReset()
    betterAuthSession.user.value = { id: 'better-auth-user' }
    betterAuthSession.ready.value = true
    betterAuthSession.isAuthenticated.value = true
    betterAuthSession.logout.mockReset()
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
  })

  it('uses token auth state and logout in token provider mode', async () => {
    const auth = useAuth<{ id: string }>()

    expect(auth.mode).toBe('frontend')
    expect(auth.provider).toBe('token')
    expect(auth.user.value).toEqual({ id: 'token-user' })
    expect(auth.ready.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.betterAuthSession).toBeUndefined()
    expect(auth.betterAuthClient).toBeUndefined()

    auth.loginWithToken('token-1')
    await auth.logout()

    expect(tokenAuth.loginWithToken).toHaveBeenCalledWith('token-1')
    expect(tokenAuth.logout).toHaveBeenCalledTimes(1)
    expect(betterAuthSession.logout).not.toHaveBeenCalled()
  })

  it('uses better-auth session and client in fullstack better-auth mode', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        mode: 'fullstack',
        provider: 'better-auth',
      },
    }

    const auth = useAuth<{ id: string }>()

    expect(auth.mode).toBe('fullstack')
    expect(auth.provider).toBe('better-auth')
    expect(auth.user.value).toEqual({ id: 'better-auth-user' })
    expect(auth.ready.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.betterAuthSession).toBe(betterAuthSession)
    expect(auth.betterAuthClient).toBe(betterAuthClient)

    await auth.logout()

    expect(betterAuthSession.logout).toHaveBeenCalledTimes(1)
    expect(tokenAuth.logout).not.toHaveBeenCalled()
  })
})
