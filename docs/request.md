# 请求体系

Nuva 的请求体系基于 alova，并通过 `core` 提供默认能力，`template` 按业务覆盖。

## 配置

请求配置位于 `runtimeConfig.public.nuva.api`。认证行为通过 `nuvaAuth` 配置，运行时的 `runtimeConfig.public.nuva.auth` 由 auth 模块合并默认值后生成。

```ts
import type { NuvaApiConfig, NuvaAuthModuleOptions } from '@oevery/nuva/config'

const api = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0,200,SUCCESS',
} satisfies NuvaApiConfig

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
} satisfies NuvaAuthModuleOptions

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
import { useDefaultHttpRequestHooks } from '@oevery/nuva/http'

export function useHttpRequestHooks(config) {
  const defaults = useDefaultHttpRequestHooks(config)
  const auth = config.auth.enabled ? useAuth() : undefined

  return {
    ...defaults,
    beforeRequest(method) {
      defaults.beforeRequest(method)
      // 追加租户、语言、traceId 等请求头
    },
    async onError(error) {
      if (auth && error.statusCode === 401) {
        auth.logout()
        await auth.toLogin()
      }

      throw error
    },
  }
}
```

## Auth 跳转

`template` 默认启用 auth 模块，并在 401 时清理登录态、跳转登录页。auth 模块会自动注册 `auth` route middleware；template 默认开启全局保护，公开页面通过 `publicRoutes` 或 `definePageMeta({ auth: false })` 跳过。跳转会携带 redirect 参数：

```txt
/login?redirect=/profile
```

登录成功后调用 `useAuth().afterLogin()` 回到来源地址。登录页路径、默认首页和 redirect 参数名在 `runtimeConfig.public.nuva.auth` 配置。

如果没有启用 `@oevery/nuva/auth`，`runtimeConfig.public.nuva.auth.enabled` 为 `false`，template 的 401 跳转逻辑不会调用 auth composable。

页面保护规则：

- `nuvaAuth.global: false` 时，只有 `definePageMeta({ auth: true })` 的页面会被保护。
- `nuvaAuth.global: true` 时，页面默认受保护。
- `definePageMeta({ auth: false })` 始终跳过保护。
- `nuvaAuth.publicRoutes` 中的路径会跳过保护，支持精确路径和 `/path/**` 前缀匹配。

## Better Auth

`fullstack` 模式会把 Better Auth 挂载到 `runtimeConfig.public.nuva.auth.betterAuth.basePath`，默认是 `/api/auth`。业务项目需要提供 `nuvaAuth.betterAuth.serverAuthImport` 指向的 auth 实例，默认路径是 `~~/server/utils/better-auth`。

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

`/api/auth/**` 保留给 Better Auth handler。template 的 token/cookie demo 登录接口使用 `/api/demo-auth/*`，避免和 fullstack 模式冲突。

Better Auth 协议请求使用官方 client，不走 alova：

```ts
const { betterAuthClient } = useAuth()
const authClient = betterAuthClient || useBetterAuth()
const { data: session } = authClient.useSession()
```

业务接口仍统一放在 `app/composables/apis/*` 并通过 `useHttpClient()` 调用。也就是说：业务 API 走 alova，Better Auth 的 `/api/auth/**` 走 `useBetterAuth()`。

`useAuth()` 是应用层统一入口，提供 `mode`、`user`、`ready`、`isAuthenticated`、`logout`、`toLogin` 和 `afterLogin`。token 读写等底层能力收在 `tokenAuth` 中；Better Auth session 和登录协议仍由 `betterAuthClient` 或 `useBetterAuth()` 管理。

Auth 模块默认只自动导入 `useAuth()` 和 `useBetterAuth()`。常规业务不需要直接调用底层 token 状态 composable 或 middleware 工厂。

`useBetterAuth()` 会缓存 client。客户端按 `baseURL` 复用；服务端挂在当前 Nuxt app/request 上，避免不同请求之间共享认证上下文。

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
