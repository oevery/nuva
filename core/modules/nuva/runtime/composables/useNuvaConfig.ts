import type { NuvaPublicConfig, NuvaResolvedConfig } from '../../../../config'
import { parseNuvaRemoteRequest } from '../../../../config'
import { useNuvaAuthResolvers } from '../../../auth/runtime/internal/useNuvaAuthResolvers'

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
      accessMenu: {
        ...config.auth.accessMenu,
        remote: {
          ...config.auth.accessMenu.remote,
          menu: parseNuvaRemoteRequest(config.auth.accessMenu.remote.menu),
        },
      },
    },
    resolvers: resolvers.value,
  } as NuvaResolvedConfig
}
