import type { NuvaPublicConfig, NuvaResolvedConfig } from '../../../../config'
import { parseNuvaRemoteRequest } from '../../../../config'
import { useNuvaAuthResolvers } from '../../../auth/runtime/composables/useNuvaAuthResolvers'

export function useNuvaConfig() {
  const config = useRuntimeConfig().public.nuva as NuvaPublicConfig
  const resolvers = useNuvaAuthResolvers()

  return {
    ...config,
    auth: {
      ...config.auth,
      permission: {
        ...config.auth.permission,
        remote: {
          ...config.auth.permission.remote,
          profile: parseNuvaRemoteRequest(config.auth.permission.remote.profile),
          permission: parseNuvaRemoteRequest(config.auth.permission.remote.permission),
        },
      },
    },
    resolvers: resolvers.value,
  } as NuvaResolvedConfig
}
