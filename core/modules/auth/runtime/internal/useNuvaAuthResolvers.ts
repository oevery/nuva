import type { NuvaMenuResolver, NuvaPermissionResolver, NuvaUserResolver } from '../../../../config'
import { useState } from 'nuxt/app'

export interface NuvaAuthResolversState {
  user: NuvaUserResolver | null
  permission: NuvaPermissionResolver | null
  menu: NuvaMenuResolver | null
}

export function useNuvaAuthResolvers() {
  return useState<NuvaAuthResolversState>('nuva:auth:resolvers', () => ({
    user: null,
    permission: null,
    menu: null,
  }))
}
