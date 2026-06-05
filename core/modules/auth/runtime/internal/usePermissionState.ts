import type { NuvaPermissionState } from '../../../../config'
import { useState } from 'nuxt/app'

interface PermissionStoreState {
  permission: NuvaPermissionState | null
  loadedAt: number
}

export function usePermissionState() {
  return useState<PermissionStoreState>('nuva:permission', () => ({
    permission: null,
    loadedAt: 0,
  }))
}
