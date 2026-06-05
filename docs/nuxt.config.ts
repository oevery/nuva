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
