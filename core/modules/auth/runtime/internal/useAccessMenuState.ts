import type { NuvaAccessMenuItem } from '../../../../config'
import { useState } from 'nuxt/app'

export interface AccessMenuState {
  menus: NuvaAccessMenuItem[]
  loadedAt: number
}

export function useAccessMenuState() {
  return useState<AccessMenuState>('nuva:access-menu', () => ({
    menus: [],
    loadedAt: 0,
  }))
}
