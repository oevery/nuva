<script setup lang="ts">
import { defaultNuvaAuthConfig } from '@oevery/nuva/config'

const provider = ref<'token' | 'better-auth'>('token')

const activeConfig = computed(() => ({
  ...defaultNuvaAuthConfig,
  enabled: true,
  provider: provider.value,
  global: provider.value === 'token',
  betterAuth: provider.value === 'better-auth'
    ? defaultNuvaAuthConfig.betterAuth
    : undefined,
}))

const providerNotes = computed(() => {
  if (provider.value === 'token') {
    return [
      '你自己实现登录接口，Nuva 只负责登录态、跳转和页面保护。',
      '业务请求继续走 alova 和 useHttpClient()。',
      '适合已有认证后端，或先把登录态接起来的项目。',
    ]
  }

  return [
    '由 @oevery/nuva/better-auth 自动挂载 Auth core 和 Better Auth handler。',
    '业务 API 仍走 alova，/api/auth/** 交给 Better Auth client。',
    '适合想把认证协议也统一到 Nuxt 项目里的场景。',
  ]
})

const configPreview = computed(() => JSON.stringify({
  provider: activeConfig.value.provider,
  loginPath: activeConfig.value.loginPath,
  homePath: activeConfig.value.homePath,
  redirectQuery: activeConfig.value.redirectQuery,
  global: activeConfig.value.global,
  publicRoutes: activeConfig.value.publicRoutes,
  betterAuth: activeConfig.value.betterAuth,
}, null, 2))
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/30 p-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p class="text-sm font-semibold text-highlighted">
          认证 Provider 对比
        </p>
        <p class="mt-1 text-sm leading-6 text-toned">
          切换 provider 后，下面会显示最常见的配置差异和适用场景。
        </p>
      </div>

      <div class="inline-flex rounded-xl border border-default bg-default/80 p-1">
        <button
          v-for="item in ['token', 'better-auth']"
          :key="item"
          class="rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="provider === item ? 'bg-primary text-inverted' : 'text-toned hover:text-default'"
          @click="provider = item as 'token' | 'better-auth'"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,60%)]">
      <div class="rounded-2xl border border-default bg-default/80 p-4">
        <ul class="space-y-3 text-sm leading-6 text-default">
          <li v-for="note in providerNotes" :key="note" class="flex gap-3">
            <span class="mt-2 h-2 w-2 rounded-full bg-primary" />
            <span>{{ note }}</span>
          </li>
        </ul>
      </div>

      <CodePreview
        data-auth-mode-code
        class="min-w-0"
        :code="configPreview"
        language="json"
        title="nuvaAuth"
        cache-key="auth-mode-config"
      />
    </div>
  </div>
</template>
