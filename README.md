# Nuva

Nuva 是一个基于 Nuxt 4 的业务优先全栈底座。它把请求、认证、权限、共享 schema、表单校验和基础工程配置收敛到可复用的 `@oevery/nuva` layer，让业务项目更快进入页面、接口和表单开发。

## 项目组成

本仓库是 pnpm workspace，包含三个工作区：

| 目录        | 包名           | 说明                                                                                     |
| ----------- | -------------- | ---------------------------------------------------------------------------------------- |
| `core/`     | `@oevery/nuva` | 可复用 Nuxt layer，提供基础模块、运行时工具、请求能力、认证权限和可选 Better Auth 集成。 |
| `template/` | `nuva-app`     | 业务模板应用，继承 `@oevery/nuva`，用于承载页面、业务 API、服务端接口和共享类型。        |
| `docs/`     | `nuva-docs`    | 官方文档站，继承 `@oevery/nuva`，基于 Nuxt Content、Nuxt UI 和文档内容构建。             |

本地开发时，`pnpm-workspace.yaml` 会通过 workspace override 将 `@oevery/nuva` 链接到本仓库的 `core/`。

## 核心能力

- Nuxt 4 layer：`core` 作为可发布的基础层，模板和文档站都通过 `extends: ['@oevery/nuva']` 复用。
- 请求体系：基于 `alova` 统一处理 `baseURL`、响应解包、成功码和请求 hooks。
- 认证与权限：`@oevery/nuva/auth` 提供登录态、路由保护和权限判断，`@oevery/nuva/better-auth` 提供可选 Better Auth 集成。
- 共享契约：推荐在 `shared` 维护前后端共用的类型、协议和 `valibot` schema。
- 内置基础能力：预置 Tailwind CSS、VueUse、Nuxt Icon、Antfu ESLint Config 和 TypeScript 检查。
- 文档与 AI 工作流：文档站按快速开始、指南、配方、参考、部署、AI 辅助和开发维护分层组织。

## 环境要求

- Node.js 20+
- pnpm 11+

## 仓库开发

安装依赖：

```bash
pnpm install
```

启动业务模板：

```bash
pnpm template:dev
```

启动文档站：

```bash
pnpm docs:dev
```

检查 core layer：

```bash
pnpm core:check
```

## 使用模板创建业务项目

如果只是基于模板开始一个业务项目，可以直接下载 `template/`：

```bash
pnpm dlx giget@latest gh:oevery/nuva/template my-app
cd my-app
pnpm install
pnpm dev
```

下载后的模板项目会回到普通 Nuxt 应用命令，例如 `pnpm dev`、`pnpm build`、`pnpm preview`。

## 常用命令

### 根目录

| 命令                | 说明                              |
| ------------------- | --------------------------------- |
| `pnpm prepare`      | 执行所有 workspace 的 `prepare`。 |
| `pnpm lint`         | 对整个仓库执行 ESLint 检查。      |
| `pnpm lint:fix`     | 对整个仓库执行 ESLint 自动修复。  |
| `pnpm typecheck`    | 执行所有 workspace 的类型检查。   |
| `pnpm check`        | 执行 `lint` 和 `typecheck`。      |
| `pnpm release:core` | 发布 `@oevery/nuva`。             |

### 业务模板

| 命令                      | 说明                       |
| ------------------------- | -------------------------- |
| `pnpm template:dev`       | 启动 `template` 开发服务。 |
| `pnpm template:build`     | 构建 `template`。          |
| `pnpm template:generate`  | 静态生成 `template`。      |
| `pnpm template:preview`   | 预览 `template` 构建产物。 |
| `pnpm template:typecheck` | 类型检查 `template`。      |

### 文档站

| 命令                  | 说明                     |
| --------------------- | ------------------------ |
| `pnpm docs:dev`       | 启动官方文档站。         |
| `pnpm docs:build`     | 构建官方文档站。         |
| `pnpm docs:generate`  | 静态生成官方文档站。     |
| `pnpm docs:preview`   | 预览官方文档站构建产物。 |
| `pnpm docs:typecheck` | 类型检查官方文档站。     |

### Core Layer

| 命令                  | 说明                                   |
| --------------------- | -------------------------------------- |
| `pnpm core:prepare`   | 生成 core 的 Nuxt 类型与自动导入声明。 |
| `pnpm core:check`     | 执行 core 的 prepare 和类型检查。      |
| `pnpm core:test`      | 执行 core 单测和 e2e 测试。            |
| `pnpm core:typecheck` | 类型检查 core。                        |

## 文档入口

### 使用 Nuva

- [快速开始](./docs/content/1.getting-started/1.index.md)：理解 Nuva、启动模板并完成第一个业务功能。
- [为什么 Nuva](./docs/content/1.getting-started/2.why-nuva.md)：了解 Nuva 解决的问题和不适合的场景。
- [快速启动](./docs/content/1.getting-started/3.quick-start.md)：使用 giget 下载模板并启动本地开发服务。
- [第一个业务功能](./docs/content/1.getting-started/4.first-feature.md)：按 `shared -> server/api -> composables/apis -> page` 完成业务闭环。
- [项目结构](./docs/content/1.getting-started/5.project-structure.md)：理解 `app`、`server`、`shared` 和配置入口。

### 开发业务

- [指南](./docs/content/2.guide/1.index.md)：解释架构、core layer、请求体系、认证权限、shared schema 和 runtime config。
- [配方](./docs/content/3.recipes/1.index.md)：按任务新增接口、API 封装、分页列表、表单提交、页面保护和 Better Auth。
- [参考](./docs/content/4.reference/1.index.md)：查 Nuxt Config、Nuva Config、HTTP、Auth、Permission、Better Auth 和 Server Utils。
- [部署](./docs/content/5.deployment/1.index.md)：处理业务项目的环境变量、构建、部署和生产排错。
- [AI 辅助](./docs/content/6.ai/1.index.md)：让 AI 按 Nuva 的目录和协作约定生成业务代码。

### 维护 Nuva 仓库

- [开发维护](./docs/content/7.maintenance/1.index.md)：维护 core、template、docs、测试、发布、升级和命令速查。

## 开发约定

- `core` 只放基础能力、运行时工具和可选模块，不放具体业务接口和业务样式。
- `template` 放业务页面、业务 API、服务端接口、共享类型和项目级配置。
- 请求统一使用 `alova` 和 Nuva 请求封装，不在业务代码中混用 `useFetch`。
- 接口契约、共享类型和 `valibot` schema 统一放在 `shared`，客户端和服务端复用同一份定义。
- 请求行为通过 `template/app/utils/http/hooks.ts` 覆盖，例如请求头、响应处理和错误处理。
- 基础登录态和权限使用 `@oevery/nuva/auth`，需要完整认证协议时再启用 `@oevery/nuva/better-auth`。
- 业务代码优先依赖 Nuxt auto-import，避免手动重复维护常用 composable 导入。
