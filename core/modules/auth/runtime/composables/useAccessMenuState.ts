import type { NuvaAccessMenuItem } from '../../../../config'

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
