import { defaultNuvaPublicConfig } from '../../config'
import { definePermissionHandler, defineProtectedHandler, getNuvaPermissionState, requireNuvaDataAccess, requireNuvaDataAccessType, requireNuvaPermission, requireNuvaRole, requireNuvaScope, setNuvaAuthContext } from '../../server/utils/permission'

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

function createTestEvent() {
  return {
    context: {},
  } as any
}

describe('server permission guards', () => {
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
})
