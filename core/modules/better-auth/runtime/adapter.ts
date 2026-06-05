import type { NuvaPermissionCheckContext, NuvaPermissionDecision, NuvaPermissionMatchMode, NuvaPermissionState } from '../../../config'
import type { NuvaAuthAdapterCore } from '../../auth/runtime/adapters/registry'
import { defineAuthAdapter, registerAuthAdapter } from '../../auth/runtime/adapters/registry'
import { matchList, toBetterAuthPermissions } from '../../auth/runtime/utils/permission'
import { useNuvaConfig } from '../../nuva/runtime/composables/useNuvaConfig'
import { useBetterAuthClient } from './composables/useBetterAuthClient'
import { useBetterAuthSession } from './internal/useBetterAuthSession'

interface BetterAuthOrganizationClient {
  hasPermission?: (payload: { permissions: Record<string, string[]>, context?: NuvaPermissionCheckContext }) => Promise<{ data?: boolean } | boolean>
  checkRolePermission?: (payload: { role: string, permissions: Record<string, string[]> }) => boolean
}

interface CachedPermissionResult {
  value: boolean
  expiresAt: number
}

const dynamicPermissionCache = new Map<string, CachedPermissionResult>()
const dynamicPermissionCacheMaxAge = 5_000

function resolveBetterAuthPermissionResult(result: { data?: boolean } | boolean) {
  return typeof result === 'boolean' ? result : !!result.data
}

function toDecision(allowed: boolean): NuvaPermissionDecision {
  return allowed ? 'allow' : 'deny'
}

function toRoleList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  return typeof value === 'string' && value ? [value] : []
}

function createBetterAuthPermissionState(session: ReturnType<typeof useBetterAuthSession>): NuvaPermissionState {
  const activeMember = session.activeMember.value as { role?: string | string[] } | null
  const activeOrganization = session.activeOrganization.value as { id?: string, slug?: string } | null

  return {
    roles: toRoleList(activeMember?.role),
    permissions: [],
    scope: {
      organizationId: activeOrganization?.id,
      organizationSlug: activeOrganization?.slug,
    },
    dataAccess: { type: 'self' },
    source: 'adapter',
  }
}

function createEmptyPermissionState(): NuvaPermissionState {
  return {
    roles: [],
    permissions: [],
    scope: {},
    dataAccess: { type: 'self' },
    source: 'adapter',
  }
}

function getOrganization() {
  return (useBetterAuthClient() as { organization?: BetterAuthOrganizationClient }).organization
}

function createPermissionCacheKey(permissionNames: string[], context?: NuvaPermissionCheckContext) {
  const session = useBetterAuthSession()

  return JSON.stringify({
    permissions: [...permissionNames].sort(),
    context: context || null,
    organization: session.activeOrganization.value,
    member: session.activeMember.value,
  })
}

async function checkOrganizationPermission(permissionNames: string[], context?: NuvaPermissionCheckContext) {
  const config = useNuvaConfig().auth.betterAuth.organization

  if (!config.hasPermission) {
    return false
  }

  const organization = getOrganization()

  if (!organization?.hasPermission) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Better Auth hasPermission is not configured',
      message: 'Set auth.betterAuth.organization.hasPermission to true and enable the Better Auth organization plugin.',
    })
  }

  const permissions = toBetterAuthPermissions(permissionNames)

  if (!permissions || !Object.keys(permissions).length) {
    return false
  }

  const cacheKey = createPermissionCacheKey(permissionNames, context)
  const cached = dynamicPermissionCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const allowed = resolveBetterAuthPermissionResult(await organization.hasPermission({ permissions, context }))
  dynamicPermissionCache.set(cacheKey, {
    value: allowed,
    expiresAt: Date.now() + dynamicPermissionCacheMaxAge,
  })

  return allowed
}

function combineResults(results: boolean[], mode: NuvaPermissionMatchMode) {
  return mode === 'any' ? results.some(Boolean) : results.every(Boolean)
}

export const createBetterAuthAdapter = defineAuthAdapter(<TUser = unknown>(): NuvaAuthAdapterCore<TUser> => {
  const session = useBetterAuthSession()

  const permission = {
    authReady: session.ready,
    loaded: session.ready,
    state: computed(() => session.ready.value ? createBetterAuthPermissionState(session) : createEmptyPermissionState()),
    async refresh() {
      clearBetterAuthPermissionCache()
      await session.refresh()
      return permission.state.value
    },
    async ensure() {
      if (!session.ready.value) {
        await session.refresh()
      }

      return permission.state.value
    },
    canState(permissionName: string) {
      const config = useNuvaConfig().auth.betterAuth.organization

      if (!config.hasPermission) {
        return toDecision(matchList(permission.state.value.permissions, permissionName))
      }

      const role = permission.state.value.roles[0]
      const permissions = toBetterAuthPermissions(permissionName)
      const organization = getOrganization()

      if (!role || !permissions || !Object.keys(permissions).length || !organization?.checkRolePermission) {
        return 'unknown' as const
      }

      return toDecision(organization.checkRolePermission({ role, permissions }))
    },
    async canAsync(permissionName: string, context?: NuvaPermissionCheckContext) {
      return checkOrganizationPermission([permissionName], context)
    },
    async anyAsync(permissionNames: string[], context?: NuvaPermissionCheckContext) {
      if (!permissionNames.length) {
        return true
      }

      const results = await Promise.all(permissionNames.map(permissionName => permission.canAsync(permissionName, context)))
      return combineResults(results, 'any')
    },
    async allAsync(permissionNames: string[], context?: NuvaPermissionCheckContext) {
      if (!permissionNames.length) {
        return true
      }

      return checkOrganizationPermission(permissionNames, context)
    },
  }

  return {
    user: session.user as NuvaAuthAdapterCore<TUser>['user'],
    ready: session.ready,
    isAuthenticated: session.isAuthenticated,
    async ensureAuthenticated() {
      await session.refresh()
      return session.isAuthenticated.value
    },
    async logout() {
      clearBetterAuthPermissionCache()
      await session.logout()
    },
    permission,
  }
})

export function registerBetterAuthAdapter() {
  registerAuthAdapter('better-auth', createBetterAuthAdapter)
}

export function clearBetterAuthPermissionCache() {
  dynamicPermissionCache.clear()
}
