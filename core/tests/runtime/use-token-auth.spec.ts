import { defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'
import { useAccessMenuState } from '../../modules/auth/runtime/internal/useAccessMenuState'
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
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          source: 'profile',
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
      menus: [{ id: 'dashboard', title: 'Dashboard', path: '/dashboard' }],
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
    expect(useAccessMenuState().value.menus).toEqual([
      expect.objectContaining({ id: 'dashboard', title: 'Dashboard', path: '/dashboard' }),
    ])

    auth.clearToken()

    expect(auth.token.value).toBeNull()
    expect(auth.user.value).toBeNull()
    expect(auth.isAuthenticated.value).toBe(false)
    expect(usePermissionState().value.permission).toBeNull()
    expect(usePermissionState().value.loadedAt).toBe(0)
    expect(useAccessMenuState().value.menus).toEqual([])
    expect(useAccessMenuState().value.loadedAt).toBe(0)
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
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          source: 'profile',
        },
      },
    }
    const profileResolver = vi.fn(async () => ({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
      menus: [{ id: 'reports', title: 'Reports', path: '/reports' }],
    }))
    useNuvaAuthResolvers().value.profile = profileResolver

    const auth = useTokenAuth<{ id: string, roles: string[], permissions: string[] }>()
    const firstUser = await auth.ensureUser()
    const secondUser = await auth.ensureUser()

    expect(firstUser).toEqual({
      id: 'remote-user',
      roles: ['manager'],
      permissions: ['report:read'],
      menus: [{ id: 'reports', title: 'Reports', path: '/reports' }],
    })
    expect(secondUser).toEqual(firstUser)
    expect(profileResolver).toHaveBeenCalledTimes(1)
    expect(usePermissionState().value.permission).toMatchObject({
      roles: ['manager'],
      permissions: ['report:read'],
      source: 'remote',
    })
    expect(useAccessMenuState().value.menus).toEqual([
      expect.objectContaining({ id: 'reports' }),
    ])
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
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          source: 'profile',
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
