<script setup lang="ts">
const props = withDefaults(defineProps<{
  code: string
  language?: string
  cacheKey?: string
}>(), {
  language: 'ts',
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function token(value: string, className: string) {
  return `<span class="${className}">${escapeHtml(value)}</span>`
}

function highlightByPattern(source: string, pattern: RegExp, render: (match: RegExpExecArray) => string) {
  let html = ''
  let lastIndex = 0
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    html += escapeHtml(source.slice(lastIndex, match.index))
    html += render(match)
    lastIndex = match.index + match[0].length
  }

  return html + escapeHtml(source.slice(lastIndex))
}

function highlightJson(source: string) {
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b/g

  return highlightByPattern(source, pattern, (match) => {
    if (match[1]) {
      return `${token(match[1], match[2] ? 'code-token-property' : 'code-token-string')}${escapeHtml(match[2] || '')}`
    }

    if (match[3]) {
      return token(match[3], 'code-token-number')
    }

    return token(match[4] || '', 'code-token-literal')
  })
}

function highlightTs(source: string) {
  const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(await|async|const|definePageMeta|export|false|function|if|import|interface|null|return|true|type|undefined)\b|(-?\b\d+(?:\.\d+)?\b)/g

  return highlightByPattern(source, pattern, (match) => {
    if (match[1]) {
      return token(match[1], 'code-token-comment')
    }

    if (match[2]) {
      return token(match[2], 'code-token-string')
    }

    if (match[3]) {
      return token(match[3], 'code-token-keyword')
    }

    return token(match[4] || '', 'code-token-number')
  })
}

function highlightVue(source: string) {
  const pattern = /(<!--[\s\S]*?-->)|(<\/?[\w.-]+)|(\s[\w:-]+)(=)("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|(\/?>)/g

  return highlightByPattern(source, pattern, (match) => {
    if (match[1]) {
      return token(match[1], 'code-token-comment')
    }

    if (match[2]) {
      return token(match[2], 'code-token-keyword')
    }

    if (match[3]) {
      return `${token(match[3], 'code-token-property')}${escapeHtml(match[4] || '')}${token(match[5] || '', 'code-token-string')}`
    }

    return token(match[6] || '', 'code-token-keyword')
  })
}

function highlightShell(source: string) {
  const pattern = /(#.*$)|\b(cd|pnpm|npm|npx|bun|yarn|git|node)\b|(dlx|install|dev|build|generate|preview|add|run)\b|((?:gh:)?[\w@./:-]+)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/gm

  return highlightByPattern(source, pattern, (match) => {
    if (match[1]) {
      return token(match[1], 'code-token-comment')
    }

    if (match[2]) {
      return token(match[2], 'code-token-keyword')
    }

    if (match[3]) {
      return token(match[3], 'code-token-literal')
    }

    if (match[4]) {
      return token(match[4], 'code-token-property')
    }

    return token(match[5] || '', 'code-token-string')
  })
}

const highlightedCode = computed(() => {
  const code = props.code.trimEnd()

  if (props.language === 'json') {
    return highlightJson(code)
  }

  if (props.language === 'vue') {
    return highlightVue(code)
  }

  if (props.language === 'bash' || props.language === 'shell' || props.language === 'sh') {
    return highlightShell(code)
  }

  return highlightTs(code)
})
</script>

<template>
  <pre class="m-0 overflow-x-auto text-sm leading-6 text-neutral-100"><code class="block min-w-max whitespace-pre" v-html="highlightedCode" /></pre>
</template>

<style scoped>
:deep(.code-token-comment) {
  color: #94a3b8;
}

:deep(.code-token-keyword) {
  color: #7dd3fc;
}

:deep(.code-token-literal) {
  color: #c4b5fd;
}

:deep(.code-token-number) {
  color: #fca5a5;
}

:deep(.code-token-property) {
  color: #93c5fd;
}

:deep(.code-token-string) {
  color: #86efac;
}
</style>
