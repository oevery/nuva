import type { NuvaPermissionConfig } from '../../../../config'
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import { hash } from 'ohash'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'

type BetterAuthClient = ReturnType<typeof createAuthClient>

const clients = new Map<string, BetterAuthClient>()

function getClientFromCache(cache: Map<string, BetterAuthClient>, key: string, createClient: () => BetterAuthClient) {
  const client = cache.get(key)

  if (client) {
    return client
  }

  const newClient = createClient()
  cache.set(key, newClient)
  return newClient
}

function createBetterAuthPlugins(config: NuvaPermissionConfig['betterAuth']) {
  const shouldUseOrganization = config.organization || config.hasPermission || config.dynamicAccessControl

  if (!shouldUseOrganization) {
    return []
  }

  return [organizationClient(config.dynamicAccessControl
    ? { dynamicAccessControl: { enabled: true } }
    : undefined)]
}

export function useBetterAuth() {
  const authConfig = useNuvaConfig().auth
  const config = authConfig.betterAuth
  const permissionConfig = authConfig.permission as { betterAuth: NuvaPermissionConfig['betterAuth'] }
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const basePath = config.basePath.startsWith('/') ? config.basePath : `/${config.basePath}`
  const baseURL = url.origin
  const plugins = createBetterAuthPlugins(permissionConfig.betterAuth)
  const key = `nuva:better-auth:${hash({ baseURL, basePath, permission: permissionConfig.betterAuth })}`

  const createClient = () => createAuthClient({
    baseURL,
    basePath,
    plugins,
    fetchOptions: {
      headers,
    },
  })

  if (import.meta.server) {
    return createClient()
  }

  return getClientFromCache(clients, key, createClient)
}
