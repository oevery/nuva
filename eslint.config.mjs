import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
  },
  {
    ignores: ['**/.nuxt/**', '**/.output/**', '**/dist/**', '.kilo/package.json'],
  },
  {
    files: ['template/package.json'],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  },
)
