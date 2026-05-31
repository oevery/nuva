import type { Profile, ProfileFormInput, ProfileFormOutput } from '#shared/api/profile'
import { useRequest } from 'alova/client'

export function useProfileApi() {
  const http = useHttpClient()

  return {
    get: () => http.Get<Profile>('/profile', {
      meta: {
        ignoreToken: true,
      },
    }),
    update: (data: ProfileFormInput) => http.Patch<ProfileFormOutput>('/profile', data),
  }
}

export function useProfile() {
  const profileApi = useProfileApi()

  return useRequest(profileApi.get())
}

export function useProfileEdit() {
  return useRequest((data: ProfileFormInput) => {
    const profileApi = useProfileApi()

    return profileApi.update(data)
  }, {
    immediate: false,
  })
}
