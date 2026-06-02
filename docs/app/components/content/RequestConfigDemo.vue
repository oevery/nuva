<script setup lang="ts">
import type { NuvaApiConfig } from '@oevery/nuva/config'
import { defaultNuvaApiConfig } from '@oevery/nuva/config'

const config = reactive<NuvaApiConfig>({
  ...defaultNuvaApiConfig,
  successCodes: '0,200,SUCCESS',
})

const wrappedResponseSample = {
  code: 0,
  message: '成功',
  data: {
    name: 'Nuva',
    layer: 'template',
  },
}

const wrappedResponsePreview = computed(() => JSON.stringify(wrappedResponseSample, null, 2) ?? '')

const runtimeConfigPreview = computed(() => `const api = ${JSON.stringify(config, null, 2)} satisfies NuvaApiConfig`)

const parsedSuccessCodes = computed<string[]>(() => config.successCodes.split(',').map(item => item.trim()).filter(Boolean))

const effectiveResult = computed(() => {
  const wrapped = wrappedResponseSample

  if (!config.envelopeUnwrap) {
    return JSON.stringify(wrapped, null, 2) ?? ''
  }

  if (!parsedSuccessCodes.value.includes(String(wrapped.code))) {
    return '当前 successCodes 不包含这个 code，请求会进入错误处理。'
  }

  return JSON.stringify(wrapped.data, null, 2) ?? ''
})
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/30 p-6">
    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">baseURL</span>
            <UInput v-model="config.baseURL" />
          </label>

          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">successCodes</span>
            <UInput v-model="config.successCodes" />
          </label>
        </div>

        <label class="flex items-center justify-between rounded-2xl border border-default bg-default/80 px-4 py-3 text-sm">
          <div>
            <p class="font-medium text-default">envelopeUnwrap</p>
            <p class="mt-1 text-toned">打开后，请求成功时会自动从 {{ '{ code, message, data }' }} 里取出 `data`。</p>
          </div>

          <USwitch v-model="config.envelopeUnwrap" />
        </label>

        <div class="rounded-2xl border border-default bg-neutral-950 p-4 text-sm text-neutral-100">
          <p class="mb-3 font-medium text-neutral-300">
            nuxt.config.ts
          </p>
          <pre class="overflow-x-auto whitespace-pre-wrap break-all leading-6">{{ runtimeConfigPreview }}</pre>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-default bg-default/80 p-4">
          <p class="text-sm font-medium text-default">
            输入响应
          </p>
          <pre class="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-sm leading-6 text-toned">{{ wrappedResponsePreview }}</pre>
        </div>

        <div class="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p class="text-sm font-medium text-default">
            useHttpClient() 最终拿到的结果
          </p>
          <pre class="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-sm leading-6 text-default">{{ effectiveResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
