import type { CurrentUser, LoginFormInput, LoginResult } from '#shared/api/auth'
import { useRequest } from 'alova/client'

export function useAuthApi() {
  const http = useHttpClient()

  return {
    login: (data: LoginFormInput) => http.Post<LoginResult>('/demo-auth/login', data, {
      meta: { ignoreToken: true },
    }),
    me: () => http.Get<CurrentUser>('/demo-auth/me'),
    logout: () => http.Post<null>('/demo-auth/logout'),
  }
}

export function useLogin() {
  const authApi = useAuthApi()
  const auth = useAuth<CurrentUser>()

  return useRequest((data: LoginFormInput) => authApi.login(data), {
    immediate: false,
  }).onSuccess(({ data }) => {
    auth.tokenAuth.setToken(data.token)
    auth.tokenAuth.setUser(data.user)
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
