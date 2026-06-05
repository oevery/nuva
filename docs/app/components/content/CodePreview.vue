<script setup lang="ts">
import { codeToHtml } from 'shiki'

const props = withDefaults(defineProps<{
  code: string
  language?: string
  title?: string
  filename?: string
  cacheKey?: string
  maxHeight?: string
  showHeader?: boolean
}>(), {
  language: 'ts',
  maxHeight: undefined,
  showHeader: true,
})

const normalizedCode = computed(() => props.code.trimEnd())
const displayLanguage = computed(() => normalizeLanguage(props.language))
const filename = computed(() => props.showHeader ? props.filename || props.title : undefined)

const highlightedCode = await useAsyncData(
  () => `code-preview:${props.cacheKey || `${displayLanguage.value}:${normalizedCode.value}`}`,
  () => codeToHtml(normalizedCode.value, {
    lang: displayLanguage.value,
    themes: {
      light: 'material-theme-lighter',
      default: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: false,
  }),
  {
    default: () => `<code>${escapeHtml(normalizedCode.value)}</code>`,
    watch: [normalizedCode, displayLanguage],
  },
)

const codeHtml = computed(() => formatHighlightedCode(highlightedCode.data.value || ''))
const baseUi = computed(() => ({
  root: 'min-w-0 max-w-full',
  base: [
    `language-${displayLanguage.value}`,
    'shiki shiki-themes material-theme-lighter github-light github-dark',
    'max-w-full',
    props.maxHeight ? 'overflow-auto' : undefined,
  ].filter(Boolean).join(' '),
}))
const baseStyle = computed(() => props.maxHeight
  ? { maxHeight: props.maxHeight }
  : undefined)

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function normalizeLanguage(language?: string) {
  if (!language || language === 'txt') {
    return 'text'
  }

  return language
}

function formatHighlightedCode(html: string) {
  return html
    .replace(/^<pre[^>]*><code>/, '')
    .replace(/<\/code><\/pre>$/, '')
    .replace(/<\/span>\n<span class="line"/g, '</span><span class="line"')
}
</script>

<template>
  <ProsePre
    :code="normalizedCode"
    :language="displayLanguage"
    :filename="filename"
    :hide-header="!filename"
    :ui="baseUi"
    :style="baseStyle"
  >
    <code v-html="codeHtml" />
  </ProsePre>
</template>
