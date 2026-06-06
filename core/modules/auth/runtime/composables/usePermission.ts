import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { createPermissionApi } from '../adapters/permission'
import { usePermissionAdapter } from '../adapters/registry'

export function usePermission() {
  const config = useNuvaConfig().auth
  const adapter = usePermissionAdapter(config.permission.source)

  if (!adapter) {
    throw createError({
      statusCode: 500,
      statusMessage: `Nuva permission adapter "${config.permission.source}" is not registered`,
    })
  }

  return createPermissionApi(adapter)
}
