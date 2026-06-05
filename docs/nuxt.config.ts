import { env } from 'node:process'

export default defineNuxtConfig({
  extends: ['@oevery/nuva'],
  srcDir: 'app',
  imports: {
    dirs: [
      'composables/apis',
      'utils',
    ],
  },
  modules: [
    '@nuxt/ui',
    '@barzhsieh/nuxt-content-mermaid',
    '@nuxt/content',
    'nuxt-llms',
  ],
  contentMermaid: {
    theme: {
      light: 'neutral',
      dark: 'dark',
    },
    toolbar: {
      title: '流程图',
      buttons: {
        copy: true,
        fullscreen: true,
        expand: true,
      },
    },
  },
  css: ['~/assets/css/main.css'],
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
        },
      },
    },
  },
  ui: {
    content: true,
  },
  llms: {
    domain: env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    title: 'Nuva Docs',
    description: 'Nuva 官方文档站，面向 Nuxt 业务项目提供 core layer、template、请求、认证、权限、共享 schema 和部署维护文档。',
    sections: [
      {
        title: 'Documentation',
        description: 'Nuva 用户指南、任务配方、API 参考、部署和维护文档。',
        contentCollection: 'docs',
      },
      {
        title: 'Landing',
        description: 'Nuva 文档首页与入口说明。',
        contentCollection: 'landing',
      },
    ],
  },
  app: {
    head: {
      title: 'Nuva Docs',
      titleTemplate: '%s · Nuva Docs',
      meta: [
        { name: 'description', content: 'Nuva 官方文档站，基于 Nuva core、Nuxt UI 和 Nuxt Content 构建。' },
      ],
    },
  },
  compatibilityDate: '2026-05-30',
})
