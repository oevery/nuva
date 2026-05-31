import type { Method } from 'alova'
import type { NuvaApiTokenConfig } from '../../types/config'

export function getAuthToken(cookieToken: string | null | undefined, config: NuvaApiTokenConfig) {
  if (import.meta.client && config.storageKey) {
    return localStorage.getItem(config.storageKey) || cookieToken
  }

  return cookieToken
}

function formatToken(token: string, prefix: string) {
  return prefix ? `${prefix} ${token}` : token
}

export function applyToken(method: Method, token: string | null | undefined, config: NuvaApiTokenConfig) {
  if (method.meta?.ignoreToken || !token) {
    return
  }

  method.config.headers = {
    ...(method.config.headers || {}),
    [config.header]: formatToken(token, config.prefix),
  }
}
