import type { Profile } from '#shared/api/profile'
import type { ApiResponse } from '#shared/api/types'
import { ok } from '#server/utils/response'

export default defineEventHandler((): ApiResponse<Profile> => ok({
  name: 'nuva-template',
  layer: 'template',
  status: 'ready',
}))
