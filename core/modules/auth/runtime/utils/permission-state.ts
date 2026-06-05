import type { NuvaPermissionState } from '../../../../config'

export function createEmptyPermissionState(source: NonNullable<NuvaPermissionState['source']>): NuvaPermissionState {
  return {
    roles: [],
    permissions: [],
    scope: {},
    dataAccess: { type: 'self' },
    source,
  }
}
