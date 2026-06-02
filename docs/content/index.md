---
title: Nuva 官方文档
description: Nuxt 业务为先的轻量全栈底座，内置请求、认证、共享 schema 与表单校验。
seo:
  title: Nuva 官方文档
  description: Nuxt 业务为先的轻量全栈底座，内置请求、认证、共享 schema 与表单校验。
hero:
  title: Nuxt 业务为先的轻量全栈底座
  description: 内置请求、认证、共享 schema 与表单校验，更快进入真实业务开发。
  tagline: 面向业务 · 轻量 · 可配置
  links:
    - label: 快速开始
      to: /getting-started
      trailingIcon: i-lucide-arrow-right
sections:
  - title: 开箱即用的核心能力
    description: 把项目启动前最常见的重复工作先整理好，让你更快进入页面、接口和表单开发。
    features:
      - title: 请求体系开箱可用
        description: 基于 alova 统一处理 baseURL、响应解包、成功码和请求 hooks，业务 API 可以直接按领域组织。
        icon: i-lucide-route
      - title: 认证能力按需启用
        description: 先接入登录态和路由保护，需要完整认证协议时再切到 Better Auth fullstack。
        icon: i-lucide-shield
      - title: 类型与校验统一复用
        description: `shared` 目录集中维护接口类型和 valibot schema，前端表单和服务端接口共用同一份规则。
        icon: i-lucide-files
  - title: 适合什么项目
    description: 适合希望少做基础搭建、尽快进入业务实现的 Nuxt 项目。
    features:
      - title: 中后台与运营工具
        description: 适合需要登录、列表、详情、表单提交和统一接口协议的业务后台。
        icon: i-lucide-layout-dashboard
      - title: BFF 与全栈应用
        description: 适合使用 Nuxt server API、shared 类型和统一响应结构组织前后端代码的项目。
        icon: i-lucide-server
      - title: 需要快速落地的模板项目
        description: 适合先下载模板快速启动，再按业务逐步替换默认实现的团队或个人项目。
        icon: i-lucide-shield-check
  - title: 从这里开始
    description: 按你的当前阶段选择阅读入口，先启动，再逐步接入请求、认证和业务能力。
    features:
      - title: 使用指引
        description: 了解 Nuva 适合什么项目，以及第一次接入时推荐的阅读顺序。
        icon: i-lucide-book-open
        to: /getting-started
      - title: 请求体系
        description: 配置 alova、响应协议、错误处理，以及业务 API 的组织方式。
        icon: i-lucide-route
        to: /request
      - title: 认证与权限
        description: 接入登录态、页面保护和 401 处理，再决定是否切到 Better Auth。
        icon: i-lucide-shield
        to: /auth
      - title: 内置能力
        description: 查看 VueUse、图标和共享 schema 等开箱能力的使用方式。
        icon: i-lucide-package
        to: /capabilities
      - title: 业务实现
        description: 按推荐顺序新增接口、API composable、页面调用和表单校验。
        icon: i-lucide-code
        to: /implementation
---
