<script setup lang="ts">
const pillars = [
  {
    name: 'core',
    role: '可复用底座',
    detail: '放 Nuxt layer、请求基础能力和可选 auth 模块，不放业务接口和业务样式。',
  },
  {
    name: 'template',
    role: '业务起点',
    detail: '放页面、服务端 API、共享类型与表单示例，是用户下载后直接继续开发的部分。',
  },
  {
    name: 'docs',
    role: '使用手册',
    detail: '用 Nuxt Content 和 Nuxt UI 组织文档，把约定翻译成用户能直接上手的说明。',
  },
]
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/40 p-6">
    <div class="grid gap-4 md:grid-cols-3">
      <article
        v-for="pillar in pillars"
        :key="pillar.name"
        class="rounded-2xl border border-default bg-default/70 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {{ pillar.name }}
          </span>
          <UBadge color="primary" variant="subtle">
            {{ pillar.role }}
          </UBadge>
        </div>

        <p class="mt-3 text-sm leading-6 text-toned">
          {{ pillar.detail }}
        </p>
      </article>
    </div>
  </div>
</template>
