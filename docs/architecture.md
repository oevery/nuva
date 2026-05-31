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
- 中性基础 CSS
- 可复用基础组件

`core` 不放业务接口、业务响应协议、权限、菜单、登录、主题风格。

## template 职责

`template` 承载业务代码：

- 页面和组件
- `server/api` 服务端接口
- `shared` 前后端共享类型
- `shared` 中的 valibot schema
- `app/composables/apis` 业务 API 和状态 hook
- `app/utils/http/hooks.ts` 请求拦截器覆盖

## 类型约定

```txt
template/shared/api/types.ts    # 通用接口协议类型
template/shared/api/profile.ts  # 业务实体类型
```

服务端和前端都从 `#shared` 引用同一份类型。

## 校验约定

全栈参数校验使用 valibot。schema 放在 `template/shared`，服务端接口使用同一份 schema 校验请求参数，前端表单通过 `@vee-validate/valibot` 接入，不绑定任何 UI 库。

## 请求约定

项目统一使用 alova 管理请求，不在业务代码中混用 `useFetch`。简单内部请求、分页、下载和复杂状态都通过 alova 体系处理。

## VueUse 约定

VueUse 由 `core` 作为基础能力提供。业务代码优先使用 Nuxt auto-import，例如直接调用 `useDebounceFn`、`useLocalStorage`、`useWindowSize`，不要在 `template` 重复安装 `@vueuse/nuxt`。

## 图标约定

Nuxt Icon 由 `core` 作为基础 UI 能力提供。业务代码可直接使用 `<Icon name="lucide:search" />`，不要在 `template` 重复安装 `@nuxt/icon`。
