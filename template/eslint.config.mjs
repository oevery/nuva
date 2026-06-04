import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
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
}, {
  files: ['package.json'],
  rules: {
    'pnpm/json-enforce-catalog': 'off',
  },
})
