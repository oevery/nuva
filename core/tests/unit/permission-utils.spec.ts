import { defaultNuvaPermissionConfig } from '../../config'
import { validateAccessMenus } from '../../modules/auth/runtime/utils/access-menu'
import { defineNuvaPermissions, explainList, explainScope, hasPermissionState, hasScope, matchList, resolvePermissionState, toBetterAuthPermissions, toList, toResourcePermission } from '../../modules/auth/runtime/utils/permission'
import { hasRouteAccessMeta, resolveRouteAccessMeta } from '../../modules/auth/runtime/utils/route-access'

describe('permission utils', () => {
  it('normalizes scalar and array permission inputs', () => {
    expect(toList('dashboard:view')).toEqual(['dashboard:view'])
    expect(toList(['a', 'b'])).toEqual(['a', 'b'])
    expect(toList()).toEqual([])
  })

  it('matches permissions in all and any modes', () => {
    const owned = ['dashboard:view', 'user:edit']
    expect(matchList(owned, ['dashboard:view', 'user:edit'], 'all')).toBe(true)
    expect(matchList(owned, ['missing', 'user:edit'], 'any')).toBe(true)
    expect(matchList(owned, ['missing'], 'all')).toBe(false)
  })

  it('resolves permission state with fallback and source', () => {
    const fallback = defaultNuvaPermissionConfig.local
    const state = resolvePermissionState({ roles: ['admin'] }, fallback, 'remote')

    expect(state.roles).toEqual(['admin'])
    expect(state.permissions).toEqual(fallback.permissions)
    expect(state.source).toBe('remote')
  })

  it('detects permission-like user payloads', () => {
    expect(hasPermissionState({ roles: ['admin'] })).toBe(true)
    expect(hasPermissionState({ permissions: ['report:read'] })).toBe(true)
    expect(hasPermissionState({ scope: { tenantId: 'tenant-1' } })).toBe(true)
    expect(hasPermissionState({})).toBe(false)
  })

  it('matches scopes by key presence', () => {
    const scope = { tenantId: 'tenant-1', departmentId: 'dept-1' }
    expect(hasScope(scope, ['tenantId', 'departmentId'], 'all')).toBe(true)
    expect(hasScope(scope, ['tenantId', 'organizationId'], 'any')).toBe(true)
    expect(hasScope(scope, ['organizationId'], 'all')).toBe(false)
  })

  it('converts permissions to better-auth map', () => {
    expect(toBetterAuthPermissions(['dashboard:view', 'report:read'])).toEqual({
      dashboard: ['view'],
      report: ['read'],
    })

    expect(toBetterAuthPermissions('invalid')).toBeNull()
    expect(toResourcePermission('dashboard', 'view')).toBe('dashboard:view')
  })

  it('defines typed permission catalogs without changing runtime values', () => {
    const permissions = defineNuvaPermissions({
      profileUpdate: 'profile:update',
      reportRead: 'report:read',
    })

    expect(permissions.profileUpdate).toBe('profile:update')
    expect(permissions.reportRead).toBe('report:read')
  })

  it('explains permission and scope decisions for diagnostics', () => {
    expect(explainList(['dashboard:view'], ['dashboard:view', 'report:read'], 'all')).toEqual({
      decision: 'deny',
      reason: 'missing-permission',
      required: ['dashboard:view', 'report:read'],
      matched: ['dashboard:view'],
      missing: ['report:read'],
      mode: 'all',
    })

    expect(explainScope({ organizationId: 'org-1' }, ['organizationId', 'tenantId'], 'any')).toMatchObject({
      decision: 'allow',
      reason: 'allowed',
      matched: ['organizationId'],
      missing: ['tenantId'],
    })
  })

  it('validates access menu route and permission consistency', () => {
    const issues = validateAccessMenus([
      { id: 'dashboard', title: 'Dashboard', path: '/dashboard', permissions: ['report:read'] },
      { id: 'missing', title: 'Missing', path: '/missing' },
    ], [
      { name: 'dashboard', path: '/dashboard', meta: { auth: { permissions: ['dashboard:view'] } } },
    ], {
      accessMismatch: true,
    })

    expect(issues).toEqual([
      expect.objectContaining({
        type: 'access-mismatch',
        field: 'permissions',
        menuAccess: ['report:read'],
        routeAccess: ['dashboard:view'],
      }),
      expect.objectContaining({
        type: 'missing-route',
        menu: expect.objectContaining({ id: 'missing' }),
      }),
    ])
  })

  it('resolves route auth meta without top-level access compatibility', () => {
    expect(resolveRouteAccessMeta({ meta: { auth: true } })).toEqual({
      roles: [],
      permissions: [],
      scopes: [],
      roleMode: undefined,
      permissionMode: undefined,
      forbiddenPath: undefined,
      requiresAuth: true,
    })

    const access = resolveRouteAccessMeta({
      meta: {
        auth: {
          roles: 'admin',
          permissions: ['profile:read'],
          scopes: ['organizationId'],
          roleMode: 'any',
          permissionMode: 'all',
          forbiddenPath: '/denied',
        },
        roles: ['ignored'],
        permissions: ['ignored:read'],
      },
    })

    expect(access).toEqual({
      roles: ['admin'],
      permissions: ['profile:read'],
      scopes: ['organizationId'],
      roleMode: 'any',
      permissionMode: 'all',
      forbiddenPath: '/denied',
      requiresAuth: true,
    })
    expect(hasRouteAccessMeta(access)).toBe(true)

    const topLevelOnly = resolveRouteAccessMeta({
      meta: {
        roles: ['admin'],
        permissions: ['profile:read'],
        scopes: ['organizationId'],
      },
    })

    expect(topLevelOnly).toMatchObject({
      roles: [],
      permissions: [],
      scopes: [],
      requiresAuth: false,
    })
    expect(hasRouteAccessMeta(topLevelOnly)).toBe(false)
  })
})
