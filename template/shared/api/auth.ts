import type { NuvaAccessScope, NuvaDataAccess, NuvaPermissionSource } from '@oevery/nuva/config'
import * as v from 'valibot'

export interface CurrentUser {
  id: number
  name: string
  roles: string[]
  permissions: string[]
  scope: NuvaAccessScope
  dataAccess: NuvaDataAccess
  source: NuvaPermissionSource
}

export interface LoginResult {
  token: string
  user: CurrentUser
}

export const loginFormSchema = v.object({
  username: v.pipe(
    v.string('请输入用户名'),
    v.trim(),
    v.nonEmpty('请输入用户名'),
  ),
  password: v.pipe(
    v.string('请输入密码'),
    v.nonEmpty('请输入密码'),
  ),
})

export type LoginFormInput = v.InferInput<typeof loginFormSchema>
export type LoginFormOutput = v.InferOutput<typeof loginFormSchema>
