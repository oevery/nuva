import { defaultNuvaPublicConfig } from '../../config'
import { defineAuthAdapter, defineServerAuthAdapter, registerAuthAdapter, registerServerAuthAdapter, resetAuthAdapters, useAuthAdapter, useServerAuthAdapter } from '../../modules/auth/runtime/adapters/registry'

const cookieState = ref<string | null>(null)

mockNuxtImport('useCookie', () => () => cookieState)

describe('auth adapter registry', () => {
  beforeEach(() => {
    clearNuxtState()
    cookieState.value = null
    resetAuthAdapters()
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
  })

  it('registers custom adapters created with defineAuthAdapter', async () => {
    const logout = vi.fn()
    const createAdapter = defineAuthAdapter(() => ({
      user: computed(() => ({ id: 'user-1' })),
      ready: computed(() => true),
      isAuthenticated: computed(() => true),
      logout,
    }))

    registerAuthAdapter('custom', createAdapter)

    const adapter = useAuthAdapter<{ id: string }>('custom')

    expect(adapter.name).toBe('custom')
    expect(adapter.user.value).toEqual({ id: 'user-1' })
    expect(adapter.ready.value).toBe(true)

    await adapter.logout()
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('resets non-token adapters', () => {
    registerAuthAdapter('custom', defineAuthAdapter(() => ({
      user: computed(() => null),
      ready: computed(() => true),
      isAuthenticated: computed(() => false),
      logout: vi.fn(),
    })))

    resetAuthAdapters()

    expect(() => useAuthAdapter('custom')).toThrow('Register a Nuva auth adapter for provider "custom"')
  })

  it('lets later registrations replace adapters with the same name', () => {
    registerAuthAdapter('custom', defineAuthAdapter(() => ({
      user: computed(() => null),
      ready: computed(() => true),
      isAuthenticated: computed(() => false),
      logout: vi.fn(),
    })))
    registerAuthAdapter('custom', defineAuthAdapter(() => ({
      user: computed(() => null),
      ready: computed(() => true),
      isAuthenticated: computed(() => false),
      logout: vi.fn(),
    })))

    expect(useAuthAdapter('custom').name).toBe('custom')
  })

  it('keeps the built-in token adapter after reset', () => {
    resetAuthAdapters()

    const adapter = useAuthAdapter('token')

    expect(adapter.name).toBe('token')
    expect(adapter.isAuthenticated.value).toBe(false)
  })

  it('registers optional server auth adapters', async () => {
    registerServerAuthAdapter('custom', defineServerAuthAdapter(() => ({
      async requireAuth(event) {
        return { event, userId: 'user-1' }
      },
    })))

    const adapter = useServerAuthAdapter<{ event: unknown, userId: string }>('custom')

    await expect(adapter?.requireAuth?.({ path: '/api/me' })).resolves.toEqual({
      event: { path: '/api/me' },
      userId: 'user-1',
    })
    expect(adapter?.name).toBe('custom')
    expect(useServerAuthAdapter('missing')).toBeNull()
  })
})
