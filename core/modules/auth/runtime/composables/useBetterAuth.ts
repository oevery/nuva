import { createAuthClient } from 'better-auth/vue'
import { hash } from 'ohash'

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

function getServerClient(key: string, createClient: () => BetterAuthClient) {
  const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & {
    _nuvaBetterAuthClients?: Map<string, BetterAuthClient>
  }

  nuxtApp._nuvaBetterAuthClients ||= new Map<string, BetterAuthClient>()
  return getClientFromCache(nuxtApp._nuvaBetterAuthClients, key, createClient)
}

export function useBetterAuth() {
  const config = useRuntimeConfig().public.nuva.auth.betterAuth
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const basePath = config.basePath.startsWith('/') ? config.basePath : `/${config.basePath}`
  const baseURL = `${url.origin}${basePath}`
  const key = `nuva:better-auth:${hash(baseURL)}`

  const createClient = () => createAuthClient({
    baseURL,
    fetchOptions: {
      headers,
    },
  })

  if (import.meta.server) {
    return getServerClient(key, createClient)
  }

  return getClientFromCache(clients, key, createClient)
}
