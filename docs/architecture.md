# 架构说明

Nuva 使用 Nuxt layer 拆分基础能力和业务模板。

## 分层

```txt
core/      # 基础 layer，包名 @oevery/nuva
template/  # 业务模板，extends @oevery/nuva
```

## core 职责

`core` 只提供通用能力：

- Nuxt layer 配置
- alova 请求客户端
- Nuxt Icon 图标组件
- VueUse auto-import
- 请求配置类型
- 默认请求 hooks
- 可选 auth 模块：登录态、token、redirect 和 Better Auth 接入入口
- 中性基础 CSS
- 可复用基础组件

`core` 不放业务接口、业务响应协议、权限、菜单、登录页 UI、主题风格。

## template 职责

`template` 承载业务代码：

- 页面和组件
- `server/api` 服务端接口
- `shared` 前后端共享类型
- `shared` 中的 valibot schema
- `app/composables/apis` 业务 API 和状态 hook
- `app/utils/http/hooks.ts` 请求拦截器覆盖
- 登录页、登录接口、用户模型和权限示例

## 类型约定

```txt
template/shared/api/types.ts    # 通用接口协议类型
template/shared/api/profile.ts  # 业务实体类型
```

服务端和前端都从 `#shared` 引用同一份类型。

## 校验约定

全栈参数校验使用 valibot。schema 放在 `template/shared`，服务端接口使用同一份 schema 校验请求参数，前端表单通过 `@vee-validate/valibot` 接入，不绑定任何 UI 库。

## 请求约定

项目业务 API 统一使用 alova 管理请求，不在业务代码中混用 `useFetch`。简单内部请求、分页、下载和复杂状态都通过 alova 体系处理。

Better Auth fullstack 模式是例外：`/api/auth/**` 属于 Better Auth 协议端点，使用 `useBetterAuth()` 返回的官方 client 调用，不再额外包一层 alova。

## Auth 约定

Auth 是 `core` 的本地可选模块，不随默认 layer 强制启用。业务项目需要登录态时，在 `nuxt.config.ts` 中加入 `@oevery/nuva/auth`。

模块支持两种模式：

- `frontend`：提供 `useAuth`、自动注册的 `auth` route middleware 和登录跳转工具，服务端登录接口由业务自己实现。
- `fullstack`：在 `frontend` 能力基础上，把 `nuvaAuth.betterAuth.basePath` 挂给 Better Auth handler。

`template` 默认使用 `frontend` 模式，并提供 token/cookie demo 登录接口。demo 接口放在 `/api/demo-auth/*`，`/api/auth/**` 保留给 Better Auth fullstack 模式。

应用层优先使用 `useAuth()` 读取登录态、执行退出和跳转。它在 `frontend` 模式下复用 token auth，并把 token 读写等底层能力收在 `tokenAuth`；在 `fullstack` 模式下额外暴露 `betterAuthClient`，但不会自动把 Better Auth session 转成 token 状态。

Auth 模块只自动导入推荐入口：`useAuth()` 和 `useBetterAuth()`。底层 token 状态和 middleware 工厂由 Nuva 内部组合管理，常规业务不需要直接调用。

`useBetterAuth()` 内部会轻量缓存 Better Auth client。客户端按 `baseURL` 复用，服务端按当前请求上下文隔离，避免跨请求共享认证上下文。

Auth middleware 会自动注册为 `auth`。core 默认不全局保护页面；template 默认开启 `global`，并通过 `publicRoutes` 和 `definePageMeta({ auth: false })` 跳过登录页等公开页面。未登录访问受保护页面会跳转到 `runtimeConfig.public.nuva.auth.loginPath`，并通过 `redirectQuery` 携带来源地址；登录成功后回跳来源地址。

## VueUse 约定

VueUse 由 `core` 作为基础能力提供。业务代码优先使用 Nuxt auto-import，例如直接调用 `useDebounceFn`、`useLocalStorage`、`useWindowSize`，不要在 `template` 重复安装 `@vueuse/nuxt`。

## 图标约定

Nuxt Icon 由 `core` 作为基础 UI 能力提供。业务代码可直接使用 `<Icon name="lucide:search" />`，不要在 `template` 重复安装 `@nuxt/icon`。
