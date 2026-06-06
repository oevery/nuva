import type { NuvaPermissionMatchMode, NuvaPermissionState } from '../../../../config'

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function toStringList(value: unknown) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)]
}

export function toMatchMode(value: unknown): NuvaPermissionMatchMode | undefined {
  return value === 'any' || value === 'all' ? value : undefined
}

export function fallbackValue<T>(primary: T | null | undefined, fallback: T) {
  return primary ?? fallback
}

export function isFresh(timestamp: number, maxAge: number) {
  return maxAge > 0 && timestamp > 0 && Date.now() - timestamp < maxAge
}

export function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return
  }

  return (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
}

export function isAuthStatusError(error: unknown) {
  const status = getErrorStatus(error)
  return status === 401 || status === 403
}

export function isRemotePermissionSource(source: NuvaPermissionState['source']) {
  return source === 'remote'
}

export function isAdapterPermissionSource(source: NuvaPermissionState['source']) {
  return source === 'adapter'
}
