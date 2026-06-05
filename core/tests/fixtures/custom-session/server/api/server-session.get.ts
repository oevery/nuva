import type { CustomSessionContext } from '../utils/custom-session'
import { useServerAuthAdapter } from '../../../../../modules/auth/runtime/adapters/server-registry'
import { registerCustomSessionServerAdapter } from '../utils/custom-session'

export default defineEventHandler(async (event) => {
  registerCustomSessionServerAdapter()

  const adapter = useServerAuthAdapter<CustomSessionContext>('custom-session')
  const context = await adapter?.requireAuth?.(event)

  return {
    adapter: adapter?.name,
    userId: context?.user.id,
    roles: context?.permission.roles,
    permissions: context?.permission.permissions,
  }
})
