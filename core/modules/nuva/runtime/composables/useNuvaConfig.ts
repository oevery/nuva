import type { NuvaPublicConfig, NuvaResolvedConfig } from '../../../../config'
import { parseNuvaRemoteMap, parseNuvaRemoteRequest } from '../../../../config'
import { useNuvaAuthResolvers } from '../../../auth/runtime/internal/useNuvaAuthResolvers'

export function useNuvaConfig() {
  const config = useRuntimeConfig().public.nuva as NuvaPublicConfig
  const resolvers = useNuvaAuthResolvers()

  return {
    ...config,
    auth: {
      ...config.auth,
      user: {
        ...config.auth.user,
        remote: {
          ...config.auth.user.remote,
          request: parseNuvaRemoteRequest(config.auth.user.remote.request),
          map: parseNuvaRemoteMap(config.auth.user.remote.map),
        },
      },
      permission: {
        ...config.auth.permission,
        remote: {
          ...config.auth.permission.remote,
          request: parseNuvaRemoteRequest(config.auth.permission.remote.request),
          map: parseNuvaRemoteMap(config.auth.permission.remote.map),
        },
      },
      accessMenu: {
        ...config.auth.accessMenu,
        remote: {
          ...config.auth.accessMenu.remote,
          request: parseNuvaRemoteRequest(config.auth.accessMenu.remote.request),
          map: parseNuvaRemoteMap(config.auth.accessMenu.remote.map),
        },
      },
    },
    resolvers: resolvers.value,
  } as NuvaResolvedConfig
}
