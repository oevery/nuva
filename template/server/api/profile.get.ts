import type { Profile } from '#shared/api/profile'
import type { ApiResponse } from '#shared/api/types'
import { definePermissionHandler } from '@oevery/nuva/server/utils/permission'
import { requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default definePermissionHandler({
  auth: requireAuth,
  permission: 'profile:read',
}, (): ApiResponse<Profile> => {
  return ok({
    name: 'nuva-template',
    layer: 'template',
    status: 'ready',
  })
})
