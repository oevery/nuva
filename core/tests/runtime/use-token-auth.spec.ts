import { defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'
import { useNuvaAuthResolvers } from '../../modules/auth/runtime/internal/useNuvaAuthResolvers'
import { usePermissionState } from '../../modules/auth/runtime/internal/usePermissionState'
import { useTokenAuth } from '../../modules/auth/runtime/internal/useTokenAuth'

const cookieState = ref<string | null>(null)

mockNuxtImport('useCookie', () => () => cookieState)

describe('useTokenAuth', () => {
  beforeEach(() => {
    clearNuxtState()
    cookieState.value = null
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          source: 'remote',
        },
      },
    }
  })

  it('stores token, user and derived permission state, then clears them together', () => {
    const auth = useTokenAuth<{
      id: string
      roles: string[]
      permissions: string[]
      scope: { organizationId: string }
    }>()

    auth.loginWithToken('token-1', {
      id: 'user-1',
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: { organizationId: 'org-1' },
    })

    expect(auth.token.value).toBe('token-1')
    expect(auth.user.value?.id).toBe('user-1')
    expect(auth.ready.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(true)
    expect(usePermissionState().value.permission).toMatchObject({
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: { organizationId: 'org-1' },
    })
    auth.clearToken()

    expect(auth.token.value).toBeNull()
    expect(auth.user.value).toBeNull()
    expect(auth.isAuthenticated.value).toBe(false)
    expect(usePermissionState().value.permission).toBeNull()
    expect(usePermissionState().value.loadedAt).toBe(0)
  })

  it('refreshes a remote user once while the cached user is fresh', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        user: {
          ...structuredClone(defaultNuvaPublicConfig.auth.user),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.user.remote),
            request: serializeNuvaRemoteRequest({ url: '/api/profile' }),
            resolver: true,
            cacheMaxAge: 60_000,
          },
        },
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          source: 'remote',
        },
      },
    }
    const userResolver = vi.fn(async () => ({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
    }))
    useNuvaAuthResolvers().value.user = userResolver

    const auth = useTokenAuth<{ id: string, roles: string[], permissions: string[] }>()
    const firstUser = await auth.ensureUser()
    const secondUser = await auth.ensureUser()

    expect(firstUser).toEqual({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
    })
    expect(secondUser).toEqual(firstUser)
    expect(userResolver).toHaveBeenCalledTimes(1)
    expect(usePermissionState().value.permission).toMatchObject({
      roles: ['manager'],
      permissions: ['report:read'],
      source: 'remote',
    })
  })

  it('clears token state when remote user refresh returns an auth error', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        user: {
          ...structuredClone(defaultNuvaPublicConfig.auth.user),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.user.remote),
            request: serializeNuvaRemoteRequest({ url: '/api/profile' }),
            resolver: true,
          },
        },
      },
    }
    useNuvaAuthResolvers().value.user = vi.fn(async () => {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    })

    const auth = useTokenAuth()
    auth.setToken('token-1')

    await expect(auth.ensureUser()).rejects.toMatchObject({ statusCode: 401 })

    expect(auth.token.value).toBeNull()
    expect(auth.user.value).toBeNull()
    expect(usePermissionState().value.permission).toBeNull()
  })
})
