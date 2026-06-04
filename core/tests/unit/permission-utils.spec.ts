import { defaultNuvaPermissionConfig } from '../../config'
import { hasPermissionState, hasScope, matchList, resolvePermissionState, toBetterAuthPermissions, toList, toResourcePermission } from '../../modules/auth/runtime/utils/permission'

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
})
