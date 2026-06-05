# Nuva

Nuva 是一个基于 Nuxt 4 的全栈脚手架，预置 `alova`、`TailwindCSS`、VueUse 和 Antfu ESLint Config。

## 目录

```txt
core/      # @oevery/nuva，纯基础 Nuxt layer
template/  # 业务模板应用
docs/      # 官方文档站应用，内容位于 docs/content/
```

## 快速开始

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
pnpm dev        # 启动 template 开发服务
pnpm build      # 构建 template
pnpm preview    # 预览构建产物
pnpm docs:dev   # 启动官方文档站
pnpm docs:build # 构建官方文档站
pnpm lint       # ESLint 检查
pnpm lint:fix   # ESLint 自动修复
pnpm typecheck  # Nuxt 类型检查
```

## 文档

- [开始使用](./docs/content/1.getting-started/1.index.md)
- [请求体系](./docs/content/2.request/1.index.md)
- [认证与权限](./docs/content/3.auth/1.index.md)
- [内置能力](./docs/content/4.capabilities/1.index.md)
- [业务实现](./docs/content/5.implementation/1.index.md)
- [AI 工作流](./docs/content/6.ai/1.index.md)

## 核心约定

- `core` 只放基础能力和可选模块，不放业务接口和业务样式。
- `template` 放业务页面、业务 API、服务端接口和共享类型。
- 请求统一使用 alova，不混用 `useFetch`。
- Auth core 通过 `@oevery/nuva/auth` 按需启用，完整 Better Auth 协议通过 `@oevery/nuva/better-auth` 可选模块启用。
- VueUse 由 `core` 提供，业务代码优先使用 Nuxt auto-import。
- 接口契约类型放在 `template/shared`。
- 请求拦截器通过 `template/app/utils/http/hooks.ts` 覆盖。
