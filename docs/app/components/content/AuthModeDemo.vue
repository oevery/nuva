<script setup lang="ts">
import type { NuvaAuthModuleMode } from '@oevery/nuva/config'
import { defaultNuvaAuthConfig } from '@oevery/nuva/config'

const mode = ref<NuvaAuthModuleMode>('frontend')

const activeConfig = computed(() => ({
  ...defaultNuvaAuthConfig,
  enabled: true,
  mode: mode.value,
  global: mode.value === 'fullstack',
}))

const modeNotes = computed(() => {
  if (mode.value === 'frontend') {
    return [
      '你自己实现登录接口，Nuva 只负责登录态、跳转和页面保护。',
      '业务请求继续走 alova 和 useHttpClient()。',
      '适合已有认证后端，或先把登录态接起来的项目。',
    ]
  }

  return [
    '在 frontend 能力上额外挂载 Better Auth handler。',
    '业务 API 仍走 alova，/api/auth/** 交给 Better Auth client。',
    '适合想把认证协议也统一到 Nuxt 项目里的场景。',
  ]
})

const configPreview = computed(() => JSON.stringify({
  mode: activeConfig.value.mode,
  loginPath: activeConfig.value.loginPath,
  homePath: activeConfig.value.homePath,
  redirectQuery: activeConfig.value.redirectQuery,
  global: activeConfig.value.global,
  publicRoutes: activeConfig.value.publicRoutes,
  betterAuth: activeConfig.value.mode === 'fullstack' ? activeConfig.value.betterAuth : undefined,
}, null, 2))
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/30 p-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p class="text-sm font-semibold text-highlighted">
          认证模式对比
        </p>
        <p class="mt-1 text-sm leading-6 text-toned">
          切换模式后，下面会显示最常见的配置差异和适用场景。
        </p>
      </div>

      <div class="inline-flex rounded-xl border border-default bg-default/80 p-1">
        <button
          v-for="item in ['frontend', 'fullstack']"
          :key="item"
          class="rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="mode === item ? 'bg-primary text-inverted' : 'text-toned hover:text-default'"
          @click="mode = item as NuvaAuthModuleMode"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_60%]">
      <div class="rounded-2xl border border-default bg-default/80 p-4">
        <ul class="space-y-3 text-sm leading-6 text-default">
          <li v-for="note in modeNotes" :key="note" class="flex gap-3">
            <span class="mt-2 h-2 w-2 rounded-full bg-primary" />
            <span>{{ note }}</span>
          </li>
        </ul>
      </div>

      <div class="w-full rounded-2xl border border-default bg-neutral-950 p-4 text-sm text-neutral-100" data-auth-mode-code>
        <p class="mb-3 font-medium text-neutral-300">
          nuvaAuth
        </p>
        <CodePreview :code="configPreview" language="json" cache-key="auth-mode-config" />
      </div>
    </div>
  </div>
</template>
