# 模板扩展

本文说明如何在 `template` 中新增业务功能。

## 新增共享类型

业务实体类型放到 `template/shared/api`。

```ts
// template/shared/api/user.ts
export interface User {
  id: number
  name: string
}
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
