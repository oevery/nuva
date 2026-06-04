import { defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'
import { useNuvaAuthResolvers } from '../../modules/auth/runtime/composables/useNuvaAuthResolvers'
import { usePermissionState } from '../../modules/auth/runtime/composables/usePermissionState'
import { useTokenAuth } from '../../modules/auth/runtime/composables/useTokenAuth'

const cookieState = ref<string | null>(null)

mockNuxtImport('useCookie', () => () => cookieState)

describe('useTokenAuth', () => {
  beforeEach(() => {
    clearNuxtState()
    cookieState.value = null
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
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

  it('refreshes a remote user once while the cached profile is fresh', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          source: 'remote',
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
            profile: serializeNuvaRemoteRequest({ url: '/api/profile' }),
            cacheMaxAge: 60_000,
            profileResolver: true,
          },
        },
      },
    }
    const profileResolver = vi.fn(async () => ({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
    }))
    useNuvaAuthResolvers().value.profile = profileResolver

    const auth = useTokenAuth<{ id: string, roles: string[], permissions: string[] }>()
    const firstUser = await auth.ensureUser()
    const secondUser = await auth.ensureUser()

    expect(firstUser).toEqual({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
    })
    expect(secondUser).toEqual(firstUser)
    expect(profileResolver).toHaveBeenCalledTimes(1)
    expect(usePermissionState().value.permission).toMatchObject({
      roles: ['manager'],
      permissions: ['report:read'],
      source: 'remote',
    })
  })

  it('clears token state when remote profile refresh returns an auth error', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          source: 'remote',
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
            profile: serializeNuvaRemoteRequest({ url: '/api/profile' }),
            profileResolver: true,
          },
        },
      },
    }
    useNuvaAuthResolvers().value.profile = vi.fn(async () => {
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
