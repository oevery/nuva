import type { H3Event } from 'h3'
import type { NuvaPublicConfig, NuvaResolvedConfig } from '../../config'
import { parseNuvaRemoteMap, parseNuvaRemoteRequest } from '../../config'

export function getNuvaConfig(event: H3Event) {
  const config = useRuntimeConfig(event).public.nuva as NuvaPublicConfig

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
  } as Omit<NuvaResolvedConfig, 'resolvers'>
}
