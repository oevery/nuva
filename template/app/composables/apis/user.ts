import type { User, UserCreateInput, UserQuery, UserUpdateInput } from '#shared/api/user'
import { reactive } from 'vue'

export function useUserApi() {
  return createResourceApi<User, UserCreateInput, UserUpdateInput, UserQuery>({
    path: '/users',
  })
}

export function useUserTable() {
  const query = reactive<UserQuery>({
    keyword: undefined,
    status: undefined,
  })
  const userApi = useUserApi()

  return {
    query,
    ...usePageApi<User, UserQuery>(userApi.list, {
      query,
    }),
  }
}
