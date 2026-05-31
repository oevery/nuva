import * as v from 'valibot'

export interface Profile {
  name: string
  layer: string
  status: string
}

export const profileFormSchema = v.object({
  name: v.pipe(
    v.string('请输入名称'),
    v.trim(),
    v.minLength(2, '名称至少 2 个字符'),
    v.maxLength(20, '名称最多 20 个字符'),
  ),
  email: v.pipe(
    v.string('请输入邮箱'),
    v.trim(),
    v.email('请输入正确的邮箱'),
    v.maxLength(100, '邮箱最多 100 个字符'),
  ),
})

export type ProfileFormInput = v.InferInput<typeof profileFormSchema>
export type ProfileFormOutput = v.InferOutput<typeof profileFormSchema>
