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

## 图标

`core` 已内置 Nuxt Icon，业务组件可直接使用 `<Icon>`：

```vue
<template>
  <Icon name="lucide:search" />
</template>
```

`template` 不需要重复安装 `@nuxt/icon`。

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

## 登录态

`core` 通过可选 auth 模块提供登录态和跳转基础能力，`template` 默认启用 `frontend` 模式并提供可替换的 token/cookie 登录示例：

```txt
template/shared/api/auth.ts
template/app/composables/apis/auth.ts
template/app/pages/login.vue
template/server/api/demo-auth/login.post.ts
template/server/api/demo-auth/me.get.ts
template/server/api/demo-auth/logout.post.ts
```

auth 模块会自动注册 `auth` route middleware。`template` 默认开启全局保护，普通页面不需要手写 `middleware: 'auth'`；公开页面使用：

```ts
definePageMeta({
  auth: false,
})
```

也可以在 `nuvaAuth.publicRoutes` 中配置公开路径，支持精确路径和 `/path/**` 前缀匹配。

未登录访问时会跳转到 `/login?redirect=<当前地址>`，登录成功后通过 `useAuth().afterLogin()` 回跳。

`frontend` 模式只处理前端状态、token 和路由跳转，服务端鉴权由业务接口自行实现。`template/server/utils/auth.ts` 是 demo 实现，生产项目应替换为真实用户体系。

需要 Better Auth 时切到 `fullstack` 模式：

```ts
export default defineNuxtConfig({
  modules: ['@oevery/nuva/auth'],
  nuvaAuth: {
    mode: 'fullstack',
    betterAuth: {
      basePath: '/api/auth',
      serverAuthImport: '~~/server/utils/better-auth',
    },
  },
})
```

`template/server/utils/better-auth.ts` 提供最小 Better Auth 实例示例。实际项目需要配置 `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`，并按业务选择数据库 adapter 或 stateless session。`/api/auth/**` 保留给 Better Auth，demo 登录接口使用 `/api/demo-auth/*`。

业务 API 继续使用 alova 和 `useHttpClient()`。Better Auth 的协议端点使用官方 client：

```ts
const { betterAuthClient } = useAuth()
const authClient = betterAuthClient || useBetterAuth()
await authClient.signIn.email({
  email,
  password,
})
```

不要再为 `/api/auth/**` 额外写 alova wrapper；这组端点由 Better Auth client 管理。`useAuth()` 只统一应用层通用能力，Better Auth session 和登录协议仍由 `betterAuthClient` 或 `useBetterAuth()` 处理。`useBetterAuth()` 已做轻量缓存，客户端按 `baseURL` 复用，服务端按请求上下文隔离。

## 配置请求

请求和 auth 配置在 `template/nuxt.config.ts` 中分开维护：

```ts
const api = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0,200,SUCCESS',
}

const auth = {
  mode: 'frontend',
  loginPath: '/login',
  homePath: '/',
  redirectQuery: 'redirect',
  global: true,
  publicRoutes: ['/login'],
  betterAuth: {
    basePath: '/api/auth',
    serverAuthImport: '~~/server/utils/better-auth',
  },
}

export default defineNuxtConfig({
  nuvaAuth: auth,
  runtimeConfig: {
    public: {
      nuva: {
        api,
      },
    },
  },
})
```

`runtimeConfig.public.nuva.auth` 不需要在 template 中手写，auth 模块会基于 `nuvaAuth` 和默认值自动生成。

AI 辅助开发能力见 [AI 增强](./ai.md)。
