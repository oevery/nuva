# 模板扩展

本文说明如何在 `template` 中新增业务功能。

## 新增共享类型

业务实体类型和 valibot schema 放到 `template/shared/api`。

```ts
// template/shared/api/user.ts
import * as v from 'valibot'

export interface User {
  id: number
  name: string
}

export const userFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2, '名称至少 2 个字符')),
})

export type UserFormInput = v.InferInput<typeof userFormSchema>
export type UserFormOutput = v.InferOutput<typeof userFormSchema>
```

分页和通用响应类型使用：

```ts
// template/shared/api/types.ts
export interface PageParams {
  pageNum: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}
```

## 新增服务端接口

服务端接口放到 `template/server/api`。

```ts
// template/server/api/users.get.ts
import type { PageResult } from '#shared/api/types'
import type { User } from '#shared/api/user'
import { ok } from '../utils/response'

export default defineEventHandler(() => ok<PageResult<User>>({
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
}))
```

请求体校验使用共享 schema：

```ts
const result = v.safeParse(userFormSchema, await readBody(event))

if (!result.success) {
  const issues = result.issues.map(issue => ({
    field: issue.path?.map(item => String(item.key)).join('.') || '',
    message: issue.message,
    type: issue.type,
  }))

  throw createError({
    statusCode: 400,
    statusMessage: 'Validation Error',
    message: result.issues[0]?.message || '参数校验失败',
    data: issues,
  })
}
```

## 新增前端 API

业务 API 放到 `template/app/composables/apis`。

```ts
// template/app/composables/apis/user.ts
import type { PageParams, PageResult } from '#shared/api/types'
import type { User } from '#shared/api/user'
import { usePagination } from 'alova/client'

export function useUserApi() {
  const http = useHttpClient()

  return {
    list: (params: PageParams) => http.Get<PageResult<User>>('/users', { params }),
  }
}

export function useUserTable() {
  const userApi = useUserApi()

  return usePagination(
    (page, pageSize) => userApi.list({ pageNum: page, pageSize }),
    {
      immediate: true,
      data: response => response.list,
      total: response => response.total,
    },
  )
}
```

## 页面使用

```vue
<script setup lang="ts">
const { data, loading, page, pageSize, total } = useUserTable()
</script>
```

## VueUse

`core` 已内置 VueUse auto-import，业务代码可直接使用常用组合式函数：

```ts
const width = useWindowSize().width
const debouncedSearch = useDebounceFn(search, 300)
```

`template` 不需要重复安装 `@vueuse/nuxt`。如需显式 `import { useDebounceFn } from '@vueuse/core'`，再由业务项目自行添加对应依赖。

## 表单校验

前端表单使用 `@vee-validate/nuxt` 和 `@vee-validate/valibot`，不绑定 UI 库。

```ts
import { toTypedSchema } from '@vee-validate/valibot'
import { userFormSchema } from '#shared/api/user'

const { defineField, errors, handleSubmit, setFieldError } = useForm({
  validationSchema: toTypedSchema(userFormSchema),
})

const [name, nameProps] = defineField('name')

const onSubmit = handleSubmit(async (values) => {
  try {
    await userApi.save(values)
  }
  catch (error) {
    const issues = error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { data?: Array<{ field: string, message: string }> } }).data?.data || []
      : []

    for (const issue of issues) {
      if (issue.field === 'name') {
        setFieldError('name', issue.message)
      }
    }
  }
})
```

## 覆盖请求 hooks

业务项目需要追加请求头、错误提示、登录跳转时，修改：

```txt
template/app/utils/http/hooks.ts
```

不要直接修改 `core`。

## 配置请求

请求配置在 `template/nuxt.config.ts`：

```ts
const nuva = {
  api: {
    baseURL: '/api',
    envelopeUnwrap: true,
    successCodes: '0,200,SUCCESS',
    token: {
      cookieName: 'token',
      storageKey: 'token',
      header: 'Authorization',
      prefix: 'Bearer',
    },
  },
}
```

AI 辅助开发能力见 [AI 增强](./ai.md)。
