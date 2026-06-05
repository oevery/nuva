---
title: Nuva 官方文档
description: Nuxt 业务为先的轻量全栈底座，内置请求、认证、共享 schema、表单校验和业务模板。
seo:
  title: Nuva 官方文档
  description: Nuxt 业务为先的轻量全栈底座，内置请求、认证、共享 schema、表单校验和业务模板。
hero:
  title: Nuxt 业务为先的轻量全栈底座
  description: 把 Nuxt 项目里反复搭建的请求、认证、权限、共享 schema 和表单约定沉到 core layer 与 template，让团队更快进入真实业务开发。
  tagline: Core layer · Template · Business first
  links:
    - label: 快速开始
      to: /getting-started
      color: primary
      variant: solid
      trailingIcon: i-lucide-arrow-right
quickStart:
  title: 5 分钟启动一个 Nuva 项目
  description: 先下载 template，跑通默认页面、接口、schema 和请求流程，再逐步替换成你的业务实现。
  command: |
    pnpm dlx giget@latest gh:oevery/nuva/template my-app
    cd my-app
    pnpm install
    pnpm dev
sections:
  - title: 为什么 Nuva
    description: Nuva 不是 UI 组件库，也不是低代码平台，而是一套面向 Nuxt 业务项目的基础约定。
    features:
      - title: 少搭重复基础设施
        description: 请求、认证、权限、schema、表单这些每个业务项目都会遇到的约定，默认已经整理好。
        icon: i-lucide-blocks
      - title: core layer 可复用
        description: `@oevery/nuva` 作为 Nuxt layer 提供基础能力，业务项目通过 `extends` 和模块按需启用。
        icon: i-lucide-layers
      - title: template 可直接落地
        description: 模板保留业务目录、默认接口、请求封装和表单示例，适合快速启动再替换业务实现。
        icon: i-lucide-rocket
  - title: 开箱能力
    description: 默认能力围绕真实业务闭环组织，不强制你从一开始理解所有内部实现。
    features:
      - title: 请求体系
        description: 基于 alova 统一处理 baseURL、响应解包、成功码、token 注入和请求 hooks。
        icon: i-lucide-route
      - title: 认证与权限
        description: Auth core 处理登录态、路由保护和权限判断，Better Auth 作为可选 adapter 渐进接入。
        icon: i-lucide-shield
      - title: 共享 schema
        description: `shared` 目录集中维护接口类型和 valibot schema，让前端表单与服务端校验共用同一份规则。
        icon: i-lucide-files
audience:
  title: 适合与不适合
  description: Nuva 的边界要比功能清单更重要。它适合需要业务约定的 Nuxt 项目，不适合替代完整业务系统。
  fits:
    - title: 中后台与运营工具
      description: 需要登录、权限、列表、详情、表单提交和统一接口协议的业务后台。
      icon: i-lucide-layout-dashboard
    - title: BFF 与全栈应用
      description: 使用 Nuxt server API、shared 类型和统一响应结构组织前后端代码。
      icon: i-lucide-server
    - title: 需要快速落地的模板项目
      description: 先拿到一个能跑的起点，再按业务逐步替换默认实现。
      icon: i-lucide-shield-check
  avoids:
    - title: 只需要静态页面
      description: 如果项目没有请求、认证、schema 或服务端接口，Nuva 的约定会显得多余。
      icon: i-lucide-file-text
    - title: 已有完整内部框架
      description: 如果团队已经有成熟的请求、认证、权限和模板体系，不建议重复叠加另一套约定。
      icon: i-lucide-git-merge
    - title: 只想找 UI 组件库
      description: Nuva 不提供完整 UI 组件体系，页面视觉和业务组件仍由项目自己决定。
      icon: i-lucide-palette
paths:
  title: 按目标选择入口
  description: 文档已经按快速上手、设计指南、任务配方、API 参考、部署和开发维护分层。
  items:
    - title: 第一次使用
      description: 从为什么使用 Nuva、快速开始和第一个业务功能开始。
      icon: i-lucide-play-circle
      to: /getting-started
    - title: 理解设计
      description: 阅读架构、core layer、app/server/shared、请求和认证边界。
      icon: i-lucide-map
      to: /guide
    - title: 复制做法
      description: 按任务完成新增接口、分页列表、表单提交、路由保护和 Better Auth。
      icon: i-lucide-wand-sparkles
      to: /recipes
    - title: 查配置和 API
      description: 查看配置项、导出入口、http、auth、permission 和 server utils。
      icon: i-lucide-list-tree
      to: /reference
    - title: 部署上线
      description: 处理业务项目的环境变量、构建、部署和生产排错。
      icon: i-lucide-settings
      to: /deployment
    - title: AI 辅助开发
      description: 让 AI 按 Nuva 约定新增接口、页面、表单和联调代码。
      icon: i-lucide-bot
      to: /ai
    - title: 开发维护
      description: 维护 Nuva 仓库本身，包括 core、template、docs、测试和发布。
      icon: i-lucide-wrench
      to: /maintenance
---
