import type { NuvaPermissionState } from '@oevery/nuva/config'
import type { CurrentUser, LoginFormInput, LoginResult } from '#shared/api/auth'
import { useRequest } from 'alova/client'

export function useAuthApi() {
  const http = useHttpClient()

  return {
    login: (data: LoginFormInput) => http.Post<LoginResult>('/demo-auth/login', data, {
      meta: { ignoreToken: true },
    }),
    me: () => http.Get<CurrentUser>('/demo-auth/me'),
    permissions: () => http.Get<NuvaPermissionState>('/demo-auth/permissions'),
    logout: () => http.Post<null>('/demo-auth/logout'),
  }
}

export function useLogin() {
  const authApi = useAuthApi()
  const auth = useAuth<CurrentUser>()

  return useRequest((data: LoginFormInput) => authApi.login(data), {
    immediate: false,
  }).onSuccess(({ data }) => {
    auth.loginWithToken(data.token, data.user)
    auth.permission.setPermission(data.user)
  })
}

export function useRefreshPermission() {
  const authApi = useAuthApi()
  const permission = usePermission()

  return useRequest(authApi.permissions(), {
    immediate: false,
  }).onSuccess(({ data }) => {
    permission.setPermission(data)
  })
}

export function useLogout() {
  const authApi = useAuthApi()
  const auth = useAuth<CurrentUser>()

  return useRequest(() => authApi.logout(), {
    immediate: false,
  }).onComplete(() => {
    auth.logout()
  })
}
