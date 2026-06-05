import { defaultNuvaPublicConfig } from '../../config'
import { defineServerAuthAdapter, registerServerAuthAdapter, resetServerAuthAdapters } from '../../modules/auth/runtime/adapters/server-registry'
import { registerBetterAuthServerAdapter } from '../../modules/better-auth/runtime/server-adapter'
import { defineNuvaPermissionHandler, definePermissionHandler, defineProtectedHandler, getNuvaAuthContext, getNuvaPermissionState, requireNuvaAuthContext, requireNuvaDataAccess, requireNuvaDataAccessType, requireNuvaPermission, requireNuvaPermissionAsync, requireNuvaRole, requireNuvaScope, setNuvaAuthContext } from '../../server/utils/permission'

const runtimeConfig = {
  public: {
    nuva: {
      ...defaultNuvaPublicConfig,
      auth: {
        ...defaultNuvaPublicConfig.auth,
        permission: {
          ...defaultNuvaPublicConfig.auth.permission,
          roleMode: 'any' as const,
          permissionMode: 'all' as const,
        },
      },
    },
  },
}

vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

function resetTestRuntimeConfig() {
  runtimeConfig.public.nuva = structuredClone(defaultNuvaPublicConfig)
  runtimeConfig.public.nuva.auth.permission = {
    ...structuredClone(defaultNuvaPublicConfig.auth.permission),
    roleMode: 'any',
    permissionMode: 'all',
  }
  useRuntimeConfig().public.nuva = runtimeConfig.public.nuva
}

function createTestEvent() {
  return {
    context: {},
    method: 'GET',
    path: '/api/test',
    node: {
      req: {
        headers: {},
        url: '/api/test',
      },
    },
    headers: {},
  } as any
}

function createHeaderEvent(headers: Record<string, string>) {
  const event = createTestEvent()

  event.node.req.headers = headers
  event.headers = headers

  return event
}

describe('server permission guards', () => {
  beforeEach(() => {
    resetServerAuthAdapters()
    resetTestRuntimeConfig()
  })

  it('stores normalized auth context and reads it back', () => {
    const event = createTestEvent()
    const state = setNuvaAuthContext(event, {
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: { userId: 'user-1', organizationId: 'org-1' },
      dataAccess: { type: 'organization', values: ['org-1'] },
    })

    expect(state.source).toBe('local')
    expect(getNuvaPermissionState(event)).toEqual(state)
  })

  it('supports local fallback when no auth context exists', () => {
    const event = createTestEvent()
    expect(getNuvaPermissionState(event, { allowLocalFallback: true })).toEqual(runtimeConfig.public.nuva.auth.permission.local)
  })

  it('throws unauthorized when no context exists and fallback is disabled', () => {
    const event = createTestEvent()
    expect(() => getNuvaPermissionState(event)).toThrowError(/Authentication is required/)
  })

  it('enforces permission, role and scope checks', () => {
    const event = createTestEvent()
    setNuvaAuthContext(event, {
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: { userId: 'user-1', organizationId: 'org-1' },
      dataAccess: { type: 'organization', values: ['org-1'] },
    })

    expect(requireNuvaPermission(event, 'dashboard:view')).toBeTruthy()
    expect(requireNuvaRole(event, 'admin')).toBeTruthy()
    expect(requireNuvaScope(event, 'organizationId')).toBeTruthy()
    expect(() => requireNuvaPermission(event, 'report:read')).toThrowError(/Missing required permission/)
  })

  it('enforces data access type and scoped access', () => {
    const event = createTestEvent()
    setNuvaAuthContext(event, {
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: { userId: 'user-1', organizationId: 'org-1' },
      dataAccess: { type: 'organization', values: ['org-1'] },
    })

    expect(requireNuvaDataAccessType(event, ['organization', 'tenant'])).toBeTruthy()
    expect(requireNuvaDataAccess(event, { organizationId: 'org-1' })).toBeTruthy()
    expect(() => requireNuvaDataAccess(event, { organizationId: 'org-2' })).toThrowError(/Missing required data access/)
  })

  it('defines protected event handlers with auth context and declarative guards', async () => {
    const event = createTestEvent()
    const handler = defineProtectedHandler({
      auth: () => ({
        roles: ['admin'],
        permissions: ['dashboard:view'],
        scope: { organizationId: 'org-1' },
      }),
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scopes: ['organizationId'],
    }, (_event, auth, permission) => ({
      roles: auth.roles,
      permissions: permission.permissions,
    }))

    await expect(handler(event)).resolves.toEqual({
      roles: ['admin'],
      permissions: ['dashboard:view'],
    })
    expect(getNuvaPermissionState(event).permissions).toEqual(['dashboard:view'])
  })

  it('defines permission event handlers that reject missing permissions', async () => {
    const handler = definePermissionHandler({
      auth: () => ({
        roles: ['viewer'],
        permissions: ['dashboard:view'],
      }),
      permission: 'dashboard:update',
    }, () => ({ ok: true }))

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('defines protected event handlers that reject missing roles and scopes', async () => {
    const auth = () => ({
      roles: ['viewer'],
      permissions: ['dashboard:view'],
      scope: { organizationId: 'org-1' },
    })

    const roleHandler = defineProtectedHandler({
      auth,
      roles: ['admin'],
    }, () => ({ ok: true }))
    const scopeHandler = defineProtectedHandler({
      auth,
      scopes: ['tenantId'],
    }, () => ({ ok: true }))

    await expect(roleHandler(createTestEvent())).rejects.toMatchObject({
      statusCode: 403,
      message: 'Missing required role',
    })
    await expect(scopeHandler(createTestEvent())).rejects.toMatchObject({
      statusCode: 403,
      message: 'Missing required scope',
    })
  })

  it('resolves auth context through the configured server auth adapter', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      async resolveContext() {
        return {
          user: { id: 'user-1' },
          permission: {
            roles: ['admin'],
            permissions: ['dashboard:view'],
            scope: { organizationId: 'org-1' },
            dataAccess: { type: 'organization' as const, values: ['org-1'] },
            source: 'adapter' as const,
          },
        }
      },
    })))

    const event = createTestEvent()
    const context = await getNuvaAuthContext<{ user: { id: string } }>(event)

    expect(context?.user.id).toBe('user-1')
    expect(getNuvaPermissionState(event).permissions).toEqual(['dashboard:view'])
    expect(requireNuvaRole(event, 'admin')).toBeTruthy()
  })

  it('requires auth context through server adapter requireAuth', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      async requireAuth() {
        return {
          roles: ['editor'],
          permissions: ['article:update'],
          scope: {},
          dataAccess: { type: 'self' as const },
        }
      },
    })))

    const event = createTestEvent()
    const context = await requireNuvaAuthContext(event)

    expect(context).toMatchObject({ roles: ['editor'] })
    expect(getNuvaPermissionState(event).permissions).toEqual(['article:update'])
  })

  it('rejects missing server auth adapter context', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      resolveContext: () => null,
    })))

    await expect(requireNuvaAuthContext(createTestEvent())).rejects.toMatchObject({ statusCode: 401 })

    resetServerAuthAdapters()
    await expect(requireNuvaAuthContext(createTestEvent())).rejects.toMatchObject({ statusCode: 500 })
  })

  it('rejects empty requireAuth results from server adapters', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      requireAuth: () => null,
    })))

    await expect(requireNuvaAuthContext(createTestEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('defines provider-based permission handlers with the configured server adapter', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      async requireAuth() {
        return {
          user: { id: 'user-1' },
          permission: {
            roles: ['admin'],
            permissions: ['dashboard:view'],
            scope: { organizationId: 'org-1' },
            dataAccess: { type: 'organization' as const, values: ['org-1'] },
            source: 'adapter' as const,
          },
        }
      },
    })))
    const handler = defineNuvaPermissionHandler({
      permission: 'dashboard:view',
    }, (_event, auth, permission) => ({
      auth,
      permission,
    }))
    const result = await handler(createTestEvent())

    expect(result.permission.permissions).toEqual(['dashboard:view'])
    expect(result.auth.user.id).toBe('user-1')
  })

  it('registers a better-auth server adapter that maps session organization context', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'better-auth'
    registerBetterAuthServerAdapter({
      auth: {
        api: {
          getSession: vi.fn(async ({ headers }: { headers: Headers }) => headers.get('cookie') === 'better-session=valid'
            ? { user: { id: 'user-1' }, session: { activeOrganizationId: 'org-1' } }
            : null),
          getFullOrganization: vi.fn(async () => ({ id: 'org-1', slug: 'acme' })),
          getActiveMember: vi.fn(async () => ({ role: 'admin' })),
        },
      },
    })

    const event = createHeaderEvent({ cookie: 'better-session=valid' })
    const context = await requireNuvaAuthContext(event)

    expect(context).toMatchObject({
      user: { id: 'user-1' },
      activeOrganization: { id: 'org-1', slug: 'acme' },
      activeMember: { role: 'admin' },
    })
    expect(requireNuvaRole(event, 'admin')).toBeTruthy()
  })

  it('delegates better-auth server permission guards to hasPermission', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'better-auth'
    const hasPermission = vi.fn(async () => ({ data: true }))

    registerBetterAuthServerAdapter({
      auth: {
        api: {
          getSession: vi.fn(async () => ({ user: { id: 'user-1' } })),
          hasPermission,
        },
      },
    })

    const event = createHeaderEvent({ cookie: 'better-session=valid' })

    await requireNuvaAuthContext(event)
    await expect(requireNuvaPermissionAsync(event, 'project:create')).resolves.toBeTruthy()
    expect(hasPermission).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      body: {
        permissions: { project: ['create'] },
      },
    })
  })

  it('passes dynamic permission context to better-auth server permission guards', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'better-auth'
    const hasPermission = vi.fn(async () => ({ data: true }))
    const context = { target: { projectId: 'project-1' } }

    registerBetterAuthServerAdapter({
      auth: {
        api: {
          getSession: vi.fn(async () => ({ user: { id: 'user-1' } })),
          hasPermission,
        },
      },
    })

    const event = createHeaderEvent({ cookie: 'better-session=valid' })

    await requireNuvaAuthContext(event)
    await expect(requireNuvaPermissionAsync(event, 'project:update', { context })).resolves.toBeTruthy()
    expect(hasPermission).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      body: {
        permissions: { project: ['update'] },
        context,
      },
    })
  })

  it('passes permission context from provider handlers', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'custom-session'
    const hasPermission = vi.fn(async () => true)
    registerServerAuthAdapter('custom-session', defineServerAuthAdapter(() => ({
      async requireAuth() {
        return {
          user: { id: 'user-1' },
          permission: {
            roles: ['admin'],
            permissions: [],
            scope: {},
            dataAccess: { type: 'self' as const },
            source: 'adapter' as const,
          },
        }
      },
      permission: {
        hasPermission,
      },
    })))
    const handler = defineNuvaPermissionHandler({
      permission: 'project:update',
      context: event => ({ target: { projectId: event.path } }),
    }, () => ({ ok: true }))

    await expect(handler(createTestEvent())).resolves.toEqual({ ok: true })
    expect(hasPermission).toHaveBeenCalledWith(
      expect.anything(),
      'project:update',
      'all',
      { target: { projectId: '/api/test' } },
    )
  })

  it('uses better-auth server permission guards in provider permission handlers', async () => {
    useRuntimeConfig().public.nuva.auth.provider = 'better-auth'
    registerBetterAuthServerAdapter({
      auth: {
        api: {
          getSession: vi.fn(async () => ({ user: { id: 'user-1' } })),
          hasPermission: vi.fn(async () => ({ data: true })),
        },
      },
    })
    const handler = defineNuvaPermissionHandler({
      permission: 'project:create',
    }, (_event, auth) => auth)

    await expect(handler(createTestEvent())).resolves.toMatchObject({
      user: { id: 'user-1' },
    })
  })
})
