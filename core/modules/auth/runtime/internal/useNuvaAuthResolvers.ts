import type { NuvaMenuResolver, NuvaPermissionResolver, NuvaProfileResolver } from '../../../../config'
import { useState } from 'nuxt/app'

export interface NuvaAuthResolversState {
  profile: NuvaProfileResolver | null
  permission: NuvaPermissionResolver | null
  menu: NuvaMenuResolver | null
}

export function useNuvaAuthResolvers() {
  return useState<NuvaAuthResolversState>('nuva:auth:resolvers', () => ({
    profile: null,
    permission: null,
    menu: null,
  }))
}
