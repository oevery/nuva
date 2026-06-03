import type { H3Event } from 'h3'
import type { NuvaPublicConfig, NuvaResolvedConfig } from '../../config'
import { parseNuvaRemoteRequest } from '../../config'

export function getNuvaConfig(event: H3Event) {
  const config = useRuntimeConfig(event).public.nuva as NuvaPublicConfig

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
  } as Omit<NuvaResolvedConfig, 'resolvers'>
}
