import { defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'
import { resetAuthAdapters } from '../../modules/auth/runtime/adapters/registry'
import { usePermission } from '../../modules/auth/runtime/composables/usePermission'
import { useNuvaAuthResolvers } from '../../modules/auth/runtime/internal/useNuvaAuthResolvers'
import { clearBetterAuthPermissionCache, registerBetterAuthAdapter } from '../../modules/better-auth/runtime/adapter'

const betterAuthClient = vi.hoisted(() => ({
  organization: {
    checkRolePermission: vi.fn(),
    hasPermission: vi.fn(),
  },
}))

vi.mock('../../modules/better-auth/runtime/composables/useBetterAuthClient', () => ({
  useBetterAuthClient: () => betterAuthClient,
}))

const cookieState = ref<string | null>(null)

mockNuxtImport('useCookie', () => () => cookieState)

describe('usePermission', () => {
  beforeEach(() => {
    clearNuxtState()
    cookieState.value = null
    resetAuthAdapters()
    registerBetterAuthAdapter()
    clearBetterAuthPermissionCache()
    betterAuthClient.organization.checkRolePermission.mockReset().mockReturnValue(true)
    betterAuthClient.organization.hasPermission.mockReset().mockResolvedValue({ data: true })
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          local: {
            roles: ['admin'],
            permissions: ['dashboard:view', 'report:read'],
            scope: { organizationId: 'org-1' },
            dataAccess: { type: 'organization', values: ['org-1'] },
            source: 'local',
          },
        },
      },
    }
  })

  it('evaluates local roles, permissions, scopes and resource actions', () => {
    const permission = usePermission()

    expect(permission.loaded.value).toBe(true)
    expect(permission.can('dashboard:view')).toBe(true)
    expect(permission.any(['missing', 'report:read'])).toBe(true)
    expect(permission.all(['dashboard:view', 'report:read'])).toBe(true)
    expect(permission.hasRole('admin')).toBe(true)
    expect(permission.hasScope('organizationId')).toBe(true)
    expect(permission.canAccess('dashboard', 'view')).toBe(true)
    expect(permission.cannot('user:delete')).toBe(true)
  })

  it('throws when remote mode cannot resolve permission from profile or permission endpoint', async () => {
    useRuntimeConfig().public.nuva.auth.permission.source = 'remote'

    const permission = usePermission()

    await expect(permission.refresh()).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Nuva permission endpoint is not configured',
    })
  })

  it('refreshes remote permission through resolver and caches the permission state', async () => {
    useRuntimeConfig().public.nuva.auth.permission = {
      ...structuredClone(defaultNuvaPublicConfig.auth.permission),
      source: 'remote',
      remote: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
        permission: serializeNuvaRemoteRequest({ url: '/api/permission' }),
        permissionResolver: true,
        cacheMaxAge: 60_000,
      },
    }
    const permissionResolver = vi.fn(async () => ({
      roles: ['editor'],
      permissions: ['article:update'],
      scope: { projectId: 'project-1' },
      dataAccess: { type: 'custom' as const },
    }))
    useNuvaAuthResolvers().value.permission = permissionResolver

    const permission = usePermission()
    const refreshed = await permission.refresh()
    const ensured = await permission.ensure()

    expect(refreshed).toMatchObject({
      roles: ['editor'],
      permissions: ['article:update'],
      scope: { projectId: 'project-1' },
      source: 'remote',
    })
    expect(ensured).toMatchObject(refreshed)
    expect(permissionResolver).toHaveBeenCalledTimes(1)
    expect(permission.can('article:update')).toBe(true)
    expect(permission.hasScope('projectId')).toBe(true)
  })

  it('ensures remote permission before async permission checks', async () => {
    useRuntimeConfig().public.nuva.auth.permission = {
      ...structuredClone(defaultNuvaPublicConfig.auth.permission),
      source: 'remote',
      remote: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
        permission: serializeNuvaRemoteRequest({ url: '/api/permission' }),
        permissionResolver: true,
        cacheMaxAge: 60_000,
      },
    }
    const permissionResolver = vi.fn(async () => ({
      roles: ['editor'],
      permissions: ['article:update', 'article:publish'],
      scope: {},
      dataAccess: { type: 'self' as const },
    }))
    useNuvaAuthResolvers().value.permission = permissionResolver

    const permission = usePermission()

    expect(permission.can('article:update')).toBe(false)
    await expect(permission.canAsync('article:update')).resolves.toBe(true)
    await expect(permission.anyAsync(['missing', 'article:publish'])).resolves.toBe(true)
    await expect(permission.allAsync(['article:update', 'article:publish'])).resolves.toBe(true)
    expect(permissionResolver).toHaveBeenCalledTimes(1)
  })

  it('uses local permission as hybrid fallback before remote refresh updates state', async () => {
    useRuntimeConfig().public.nuva.auth.permission = {
      ...structuredClone(defaultNuvaPublicConfig.auth.permission),
      source: 'hybrid',
      local: {
        roles: ['viewer'],
        permissions: ['dashboard:view'],
        scope: { organizationId: 'local-org' },
        dataAccess: { type: 'self' },
        source: 'local',
      },
      remote: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
        permission: serializeNuvaRemoteRequest({ url: '/api/permission' }),
        permissionResolver: true,
      },
    }
    useNuvaAuthResolvers().value.permission = vi.fn(async () => ({
      roles: ['admin'],
      permissions: ['admin:read'],
      scope: { organizationId: 'remote-org' },
      dataAccess: { type: 'organization' as const, values: ['remote-org'] },
    }))

    const permission = usePermission()

    expect(permission.loaded.value).toBe(true)
    expect(permission.can('dashboard:view')).toBe(true)
    expect(permission.hasRole('viewer')).toBe(true)

    await permission.ensure()

    expect(permission.can('dashboard:view')).toBe(false)
    expect(permission.can('admin:read')).toBe(true)
    expect(permission.hasRole('admin')).toBe(true)
    expect(permission.scope.value).toEqual({ organizationId: 'remote-org' })
  })

  it('delegates better-auth role and permission checks to the organization client', async () => {
    useRuntimeConfig().public.nuva.auth = {
      ...structuredClone(defaultNuvaPublicConfig.auth),
      provider: 'better-auth',
      betterAuth: {
        ...structuredClone(defaultNuvaPublicConfig.auth.betterAuth),
        organization: {
          enabled: true,
          hasPermission: true,
          dynamicAccessControl: false,
        },
      },
      permission: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission),
        source: 'adapter',
        provider: 'adapter',
      },
    }
    useState('nuva:better-auth-session', () => ({
      data: null,
      activeOrganization: null,
      activeMember: null,
      ready: false,
    })).value = {
      data: { user: { id: 'user-1' } },
      activeOrganization: { id: 'org-1', slug: 'acme' },
      activeMember: { role: 'owner' },
      ready: true,
    }

    const permission = usePermission()

    expect(permission.ready.value).toBe(true)
    expect(permission.source.value).toBe('adapter')
    expect(permission.roles.value).toEqual(['owner'])
    expect(permission.scope.value).toEqual({ organizationId: 'org-1', organizationSlug: 'acme' })
    expect(permission.canState('project:read')).toBe('allow')
    expect(betterAuthClient.organization.checkRolePermission).toHaveBeenCalledWith({
      role: 'owner',
      permissions: { project: ['read'] },
    })

    await expect(permission.canAsync('project:update')).resolves.toBe(true)
    expect(betterAuthClient.organization.hasPermission).toHaveBeenCalledWith({
      permissions: { project: ['update'] },
      context: undefined,
    })

    await expect(permission.allAsync(['project:read', 'project:update'])).resolves.toBe(true)
    expect(betterAuthClient.organization.hasPermission).toHaveBeenLastCalledWith({
      permissions: { project: ['read', 'update'] },
      context: undefined,
    })
  })

  it('passes context to better-auth dynamic checks and caches duplicate requests briefly', async () => {
    useRuntimeConfig().public.nuva.auth = {
      ...structuredClone(defaultNuvaPublicConfig.auth),
      provider: 'better-auth',
      betterAuth: {
        ...structuredClone(defaultNuvaPublicConfig.auth.betterAuth),
        organization: {
          enabled: true,
          hasPermission: true,
          dynamicAccessControl: true,
        },
      },
      permission: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission),
        source: 'adapter',
        provider: 'adapter',
      },
    }
    useState('nuva:better-auth-session', () => ({
      data: null,
      activeOrganization: null,
      activeMember: null,
      ready: false,
    })).value = {
      data: { user: { id: 'user-1' } },
      activeOrganization: { id: 'org-1' },
      activeMember: { role: 'owner' },
      ready: true,
    }
    const context = { target: { projectId: 'project-1' } }
    const permission = usePermission()

    await expect(permission.canAsync('project:update', context)).resolves.toBe(true)
    await expect(permission.canAsync('project:update', context)).resolves.toBe(true)

    expect(betterAuthClient.organization.hasPermission).toHaveBeenCalledTimes(1)
    expect(betterAuthClient.organization.hasPermission).toHaveBeenCalledWith({
      permissions: { project: ['update'] },
      context,
    })
  })

  it('returns diagnostic explanations for local permission state', () => {
    const permission = usePermission()

    expect(permission.explain(['dashboard:view', 'missing'], 'all')).toMatchObject({
      decision: 'deny',
      missing: ['missing'],
    })
    expect(permission.explainRole('admin')).toMatchObject({ decision: 'allow' })
    expect(permission.explainScope('tenantId')).toMatchObject({
      decision: 'deny',
      reason: 'missing-scope',
    })
  })
})
