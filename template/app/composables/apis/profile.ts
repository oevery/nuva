import type { Profile } from '#shared/api/profile'
import { useRequest } from 'alova/client'

export function useProfileApi() {
  const http = useHttpClient()

  return {
    get: () => http.Get<Profile>('/profile', {
      meta: {
        ignoreToken: true,
      },
    }),
  }
}

export function useProfile() {
  const profileApi = useProfileApi()

  return useRequest(profileApi.get())
}
