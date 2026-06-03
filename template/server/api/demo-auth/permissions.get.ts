import type { NuvaPermissionState } from '@oevery/nuva/config'
import type { ApiResponse } from '#shared/api/types'
import { demoUser, requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<NuvaPermissionState> => {
  requireAuth(event)

  return ok({
    roles: demoUser.roles,
    permissions: demoUser.permissions,
    scope: demoUser.scope,
    dataAccess: demoUser.dataAccess,
    source: demoUser.source,
  })
})
