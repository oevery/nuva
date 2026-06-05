import type { NuvaPermissionState } from '../../../../config'

interface BetterAuthPermissionStateInput {
  session?: unknown
  activeOrganization?: unknown
  activeMember?: unknown
}

function toRoleList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  return typeof value === 'string' && value ? [value] : []
}

function toActiveOrganization(value: unknown) {
  return value && typeof value === 'object'
    ? value as { id?: string, slug?: string }
    : null
}

function toActiveMember(value: unknown) {
  return value && typeof value === 'object'
    ? value as { role?: string | string[] }
    : null
}

export function getBetterAuthActiveOrganizationId(session: unknown) {
  if (!session || typeof session !== 'object') {
    return undefined
  }

  return (session as { session?: { activeOrganizationId?: string | null }, activeOrganizationId?: string | null }).activeOrganizationId
    || (session as { session?: { activeOrganizationId?: string | null } }).session?.activeOrganizationId
    || undefined
}

export function createBetterAuthPermissionState(input: BetterAuthPermissionStateInput = {}): NuvaPermissionState {
  const organization = toActiveOrganization(input.activeOrganization)
  const member = toActiveMember(input.activeMember)

  return {
    roles: toRoleList(member?.role),
    permissions: [],
    scope: {
      organizationId: organization?.id || getBetterAuthActiveOrganizationId(input.session),
      organizationSlug: organization?.slug,
    },
    dataAccess: { type: 'self' },
    source: 'adapter',
  }
}
