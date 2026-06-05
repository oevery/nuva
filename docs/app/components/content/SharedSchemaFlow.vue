<script setup lang="ts">
import type { ProfileFormInput } from '../../../../template/shared/api/profile'
import * as v from 'valibot'
import { profileFormSchema } from '../../../../template/shared/api/profile'

const form = reactive<ProfileFormInput>({
  name: 'Nuva',
  email: 'nuva@example.com',
})

const result = computed(() => v.safeParse(profileFormSchema, form, {
  abortPipeEarly: true,
}))

const issues = computed(() => {
  if (result.value.success) {
    return []
  }

  return result.value.issues.map(issue => ({
    field: issue.path?.map(item => String(item.key)).join('.') || 'form',
    message: issue.message,
  }))
})

const output = computed(() => {
  if (!result.value.success) {
    return JSON.stringify(issues.value, null, 2)
  }

  return JSON.stringify(result.value.output, null, 2)
})
</script>

<template>
  <div class="my-8 rounded-3xl border border-default bg-elevated/30 p-6">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-highlighted">
          一份 schema，同步服务前后端
        </p>
        <p class="mt-2 text-sm leading-6 text-toned">
          这里直接引用 `template/shared/api/profile.ts` 里的 `profileFormSchema`。修改输入值后，右侧会立即展示同一份 schema 的校验结果。
        </p>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">名称</span>
            <UInput v-model="form.name" />
          </label>

          <label class="grid gap-2 text-sm">
            <span class="font-medium text-default">邮箱</span>
            <UInput v-model="form.email" type="email" />
          </label>
        </div>
      </div>

      <div class="min-w-0 space-y-4">
        <UAlert
          :color="result.success ? 'success' : 'warning'"
          :title="result.success ? '校验通过' : '校验未通过'"
          :description="result.success ? '前端表单和服务端接口都会拿到同一份合法输出。' : '字段规则不需要重复写，问题会在同一份 schema 上暴露。'"
          variant="subtle"
        />

        <CodePreview
          :code="output"
          language="json"
          title="safeParse 输出"
          cache-key="shared-schema-output"
        />
      </div>
    </div>
  </div>
</template>
