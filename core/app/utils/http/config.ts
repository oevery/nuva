import type { HttpSuccessCodes } from '../../types/alova'
import { useRequestURL } from 'nuxt/app'

export function normalizeSuccessCodes(codes: HttpSuccessCodes | unknown): Array<number | string> {
  if (Array.isArray(codes)) {
    return codes.filter(code => ['number', 'string'].includes(typeof code))
  }

  if (typeof codes === 'number') {
    return [codes]
  }

  if (typeof codes === 'string') {
    return codes
      .split(',')
      .map(code => code.trim())
      .filter(Boolean)
      .map(code => (/^-?\d+$/.test(code) ? Number(code) : code))
  }

  return [0]
}

export function resolveNuxtBaseURL(baseURL: string) {
  if (import.meta.server && baseURL.startsWith('/')) {
    return new URL(baseURL, useRequestURL().origin).toString().replace(/\/$/, '')
  }

  return baseURL
}

export function isSameOriginURL(url: string) {
  if (!import.meta.server) {
    return false
  }

  const requestURL = useRequestURL()
  const targetURL = new URL(url, requestURL.origin)

  return targetURL.origin === requestURL.origin
}
