# 请求体系

Nuva 的请求体系基于 alova，并通过 `core` 提供默认能力，`template` 按业务覆盖。

## 配置

请求配置位于 `runtimeConfig.public.nuva.api`。

```ts
import type { NuvaPublicConfig } from '@oevery/nuva/app/types/config'

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
} satisfies NuvaPublicConfig
```

## 响应协议

国内中后台默认使用：

```ts
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}
```

当 `envelopeUnwrap` 为 `true` 时，`useHttpClient` 会校验 `code`，成功后返回 `data`。

## metadata

单个接口可以通过 alova `meta` 覆盖全局行为。

```ts
http.Get('/profile', {
  meta: {
    ignoreToken: true,
    responseType: 'json',
    envelopeUnwrap: true,
    successCodes: '0,200',
  },
})
```

常用字段：

- `ignoreToken`：跳过 token 注入。
- `responseType`：指定响应解析类型，支持 `json`、`text`、`blob`、`arrayBuffer`、`raw`。
- `envelopeUnwrap`：单接口是否解包 `{ code, message, data }`。
- `successCodes`：单接口成功码。

## 下载

下载文件建议显式声明响应类型。

```ts
blob: () => http.Get<Blob>('/export', {
  meta: {
    responseType: 'blob',
  },
})
```

需要读取文件名或响应头时使用 `raw`。

```ts
raw: () => http.Get<Response>('/export', {
  meta: {
    responseType: 'raw',
  },
})
```

## hooks 覆盖

core 默认 hooks 在：

```txt
core/app/utils/http/default-hooks.ts
```

template 可覆盖：

```txt
template/app/utils/http/hooks.ts
```

示例：

```ts
import { useDefaultHttpRequestHooks } from '#nuva-core/app/utils/http/default-hooks'

export function useHttpRequestHooks(config) {
  const defaults = useDefaultHttpRequestHooks(config)

  return {
    ...defaults,
    beforeRequest(method) {
      defaults.beforeRequest(method)
      // 追加租户、语言、traceId 等请求头
    },
  }
}
```

## 业务 API 文件

业务 API 放在：

```txt
template/app/composables/apis/*.ts
```

推荐同一业务域一个文件，`useXxxApi` 放接口方法，`useXxxTable` 放分页等状态组合。

## 参数校验

全栈参数校验使用 valibot：

- schema 放在 `template/shared/api`。
- 服务端接口使用 `v.safeParse` 校验请求参数。
- 前端表单使用 `@vee-validate/valibot` 的 `toTypedSchema`。
- 表单示例不绑定 UI 库，直接使用原生 input。
