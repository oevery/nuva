import type { NuvaMenuResolver, NuvaPermissionResolver, NuvaProfileResolver } from '../../../../config'

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
