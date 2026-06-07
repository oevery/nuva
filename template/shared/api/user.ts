import * as v from 'valibot'

export interface User {
  id: string
  name: string
  status: 'enabled' | 'disabled'
}

export interface UserQuery {
  keyword?: string
  status?: User['status']
}

export const userFormSchema = v.object({
  name: v.pipe(
    v.string('请输入名称'),
    v.trim(),
    v.minLength(2, '名称至少 2 个字符'),
    v.maxLength(20, '名称最多 20 个字符'),
  ),
  status: v.picklist(['enabled', 'disabled'], '请选择状态'),
})

export type UserCreateInput = v.InferInput<typeof userFormSchema>
export type UserUpdateInput = Partial<UserCreateInput>
