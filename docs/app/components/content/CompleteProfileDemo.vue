<script setup lang="ts">
import type { ProfileFormInput } from '../../../../template/shared/api/profile'
import * as v from 'valibot'
import { profileFormSchema } from '../../../../template/shared/api/profile'

type PreviewStep = 'request' | 'client' | 'server'
interface DemoStep {
  key: PreviewStep
  title: string
  description: string
  status: string
  color: 'neutral' | 'success' | 'warning'
  codeLabel: string
  content: string
}

interface DemoIssue {
  field: string
  message: string
}

const form = reactive<ProfileFormInput>({
  name: 'Nuva',
  email: 'nuva@example.com',
})

const activeStep = ref<PreviewStep>('request')

const clientResult = computed(() => v.safeParse(profileFormSchema, form, {
  abortPipeEarly: true,
}))

const clientIssues = computed<DemoIssue[]>(() => {
  if (clientResult.value.success) {
    return []
  }

  return clientResult.value.issues.map(issue => ({
    field: issue.path?.map(item => String(item.key)).join('.') || 'form',
    message: issue.message,
  }))
})

const serverLog = computed(() => {
  if (!clientResult.value.success) {
    return {
      status: 400,
      message: clientIssues.value[0]?.message || '参数校验失败',
      issues: clientIssues.value,
    }
  }

  return {
    status: 200,
    message: '保存成功',
    data: clientResult.value.output,
  }
})

const previewRequest = computed(() => JSON.stringify(form, null, 2) ?? '')
const previewClient = computed(() => JSON.stringify(clientResult.value.success
  ? { success: true, output: clientResult.value.output }
  : {
      success: false,
      issues: clientIssues.value,
    }, null, 2) ?? '')
const previewServer = computed(() => JSON.stringify(serverLog.value, null, 2) ?? '')

const fieldChecks = computed(() => {
  const checks = [
    {
      label: '名称',
      passed: form.name.trim().length >= 2 && form.name.trim().length <= 20,
      message: form.name.trim().length >= 2 && form.name.trim().length <= 20 ? '已通过' : '需要 2-20 个字符',
    },
    {
      label: '邮箱',
      passed: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(form.email.trim()) && form.email.trim().length <= 100,
      message: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(form.email.trim()) && form.email.trim().length <= 100 ? '已通过' : '请输入有效邮箱',
    },
  ]

  return checks
})

const steps = computed<DemoStep[]>(() => [
  {
    key: 'request',
    title: '提交请求体',
    description: '页面当前会把什么数据发给接口。',
    status: '原始输入',
    color: 'neutral',
    codeLabel: 'request payload',
    content: previewRequest.value,
  },
  {
    key: 'client',
    title: '前端校验',
    description: clientResult.value.success
      ? '字段已通过前端校验，可以进入提交阶段。'
      : '字段会先在前端暴露问题，避免无效请求直接打到服务端。',
    status: clientResult.value.success ? '校验通过' : '校验未通过',
    color: clientResult.value.success ? 'success' : 'warning',
    codeLabel: 'client validation',
    content: previewClient.value,
  },
  {
    key: 'server',
    title: '服务端返回结果',
    description: clientResult.value.success
      ? '服务端会拿到合法输入，并返回保存成功结果。'
      : '如果绕过前端校验，服务端仍会用同一份 schema 拦住非法输入。',
    status: `${serverLog.value.status}`,
    color: serverLog.value.status === 200 ? 'success' : 'warning',
    codeLabel: 'server response',
    content: previewServer.value,
  },
])

const currentStep = computed<DemoStep>(() => steps.value.find(step => step.key === activeStep.value) ?? steps.value[0]!)
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/30 p-6">
    <div class="max-w-2xl">
      <p class="text-sm font-semibold text-highlighted">
        一份 schema，贯通前端和服务端
      </p>
      <p class="mt-2 text-sm leading-6 text-toned">
        改动表单值后，在下方 Inspector 查看请求体、前端校验和服务端返回。
      </p>
    </div>

    <div class="mt-6 rounded-2xl border border-default bg-default/80 p-5">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">名称</span>
            <UInput v-model="form.name" />
          </label>

          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">邮箱</span>
            <UInput v-model="form.email" type="email" />
          </label>
        </div>

        <div class="rounded-2xl border border-default bg-elevated/40 p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-default">
                当前提交状态
              </p>
            </div>

            <UBadge
              :color="clientResult.success ? 'success' : 'warning'"
              variant="subtle"
              size="lg"
              class="min-w-[6.5rem] justify-center px-3"
            >
              {{ clientResult.success ? '可以提交' : '待修正' }}
            </UBadge>
          </div>

          <div class="mt-4 grid gap-2">
            <div
              v-for="item in fieldChecks"
              :key="item.label"
              class="flex items-center justify-between rounded-xl border border-default/70 bg-default/70 px-3 py-2 text-sm"
            >
              <span class="text-default">{{ item.label }}</span>
              <span :class="item.passed ? 'text-success' : 'text-warning'">
                {{ item.message }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 overflow-hidden rounded-2xl border border-default bg-default text-sm shadow-sm">
      <div class="border-b border-default bg-elevated/55 p-3">
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            v-for="(step, index) in steps"
            :key="step.key"
            class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition"
            :class="activeStep === step.key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-default bg-default/70 text-toned hover:border-primary/30 hover:text-default'"
            @click="activeStep = step.key"
          >
            <span class="flex items-center gap-2 text-sm font-medium">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-elevated text-xs">
                {{ index + 1 }}
              </span>
              {{ step.title }}
            </span>

            <UBadge :color="step.color" variant="subtle">
              {{ step.status }}
            </UBadge>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-b border-default px-4 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-lg font-semibold text-highlighted">
            {{ currentStep.title }}
          </p>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-toned">
            {{ currentStep.description }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UBadge :color="currentStep.color" variant="subtle" size="lg">
            {{ currentStep.status }}
          </UBadge>
          <code class="text-xs uppercase tracking-[0.2em] text-muted">
            {{ currentStep.codeLabel }}
          </code>
        </div>
      </div>

      <div class="px-4 py-4">
        <CodePreview
          :code="currentStep.content"
          language="json"
          :title="currentStep.codeLabel"
          :cache-key="`complete-profile-${currentStep.key}`"
          max-height="26rem"
        />
      </div>
    </div>
  </div>
</template>
