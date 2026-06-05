export default defineAppConfig({
  name: 'Nuva Docs',
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'slate',
    },
    icons: {
      loading: 'i-lucide-loader-circle',
      close: 'i-lucide-x',
      check: 'i-lucide-check',
      chevronDown: 'i-lucide-chevron-down',
      chevronRight: 'i-lucide-chevron-right',
      arrowLeft: 'i-lucide-arrow-left',
      arrowRight: 'i-lucide-arrow-right',
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted',
      },
    },
  },
  seo: {
    siteName: 'Nuva Docs',
  },
  header: {
    title: 'Nuva',
    to: '/',
    search: true,
    colorMode: true,
    nav: [
      {
        label: '文档',
        to: '/getting-started',
      },
      {
        label: '指南',
        to: '/guide',
      },
      {
        label: '配方',
        to: '/recipes',
      },
      {
        label: '参考',
        to: '/reference',
      },
      {
        label: '部署',
        to: '/deployment',
      },
      {
        label: '开发维护',
        to: '/maintenance',
      },
    ],
    links: [
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/oevery/nuva',
        'target': '_blank',
        'aria-label': 'GitHub',
      },
    ],
  },
  footer: {
    credits: `Built with Nuxt UI - ${new Date().getFullYear()}`,
    colorMode: false,
    links: [
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/oevery/nuva',
        'target': '_blank',
        'aria-label': 'GitHub',
      },
    ],
  },
  toc: {
    title: '目录',
    bottom: {
      title: '链接',
      links: [
        {
          icon: 'i-lucide-book-open',
          label: 'Nuxt 文档',
          to: 'https://nuxt.com/docs/getting-started/introduction',
          target: '_blank',
        },
        {
          icon: 'i-lucide-send',
          label: 'Alova 文档',
          to: 'https://alova.js.org/',
          target: '_blank',
        },
        {
          icon: 'i-simple-icons-github',
          label: 'GitHub',
          to: 'https://github.com/oevery/nuva',
          target: '_blank',
        },
      ],
    },
  },
})
