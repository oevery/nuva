import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  pnpm: {
    catalogs: false,
  },
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },
}, {
  ignores: [
    '**/.nuxt/**',
    '**/.output/**',
    '**/dist/**',
  ],
})
