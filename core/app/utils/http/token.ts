import type { Method } from 'alova'
import type { NuvaAuthTokenConfig } from '../../../config'

export function resolveTokenValue(cookieToken: string | null | undefined, config: NuvaAuthTokenConfig) {
  if (import.meta.client && config.storageKey) {
    return localStorage.getItem(config.storageKey) || cookieToken
  }

  return cookieToken
}

function formatAuthHeaderValue(token: string, prefix: string) {
  return prefix ? `${prefix} ${token}` : token
}

export function applyAuthHeader(method: Method, token: string | null | undefined, config: NuvaAuthTokenConfig) {
  if (method.meta?.ignoreToken || !token) {
    return
  }

  method.config.headers = {
    ...(method.config.headers || {}),
    [config.header]: formatAuthHeaderValue(token, config.prefix),
  }
}
