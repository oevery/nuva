# Nuva

Nuva 是一个基于 Nuxt 4 的全栈脚手架，预置 `alova`、`TailwindCSS` 和 Antfu ESLint Config。

## 目录

```txt
core/      # @oevery/nuva，纯基础 Nuxt layer
template/  # 业务模板应用
docs/      # 设计和使用说明
```

## 快速开始

```bash
pnpm install
pnpm dev
```

## Skills

如果使用模板内置 skills，可在安装依赖后同步：

```bash
pnpm skills:install
```

也可以直接使用：

```bash
npx skills experimental_install
pnpx skills experimental_install
```

更新 skills：

```bash
npx skills update
pnpx skills update
```

## 常用命令

```bash
pnpm dev        # 启动 template 开发服务
pnpm build      # 构建 template
pnpm preview    # 预览构建产物
pnpm lint       # ESLint 检查
pnpm lint:fix   # ESLint 自动修复
pnpm typecheck  # Nuxt 类型检查
```

## 文档

- [架构说明](./docs/architecture.md)
- [请求体系](./docs/request.md)
- [模板扩展](./docs/template.md)

## 核心约定

- `core` 只放基础能力，不放业务接口和业务样式。
- `template` 放业务页面、业务 API、服务端接口和共享类型。
- 请求统一使用 alova，不混用 `useFetch`。
- 接口契约类型放在 `template/shared`。
- 请求拦截器通过 `template/app/utils/http/hooks.ts` 覆盖。
