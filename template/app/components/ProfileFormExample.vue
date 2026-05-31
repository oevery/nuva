<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot'
import { profileFormSchema } from '#shared/api/profile'

interface ValidationIssue {
  field: string
  message: string
  type: string
}

const { send: updateProfile, loading } = useProfileEdit()

const { defineField, errors, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(profileFormSchema),
  initialValues: {
    name: 'Nuva',
    email: 'nuva@example.com',
  },
})

const [name, nameProps] = defineField('name')
const [email, emailProps] = defineField('email')
const savedMessage = ref('')
const submitMessage = ref('')

function getValidationIssues(error: unknown) {
  const data = error && typeof error === 'object' && 'data' in error
    ? (error as { data?: { data?: unknown } }).data?.data
    : undefined

  return Array.isArray(data) ? data as ValidationIssue[] : []
}

function applyServerValidationErrors(error: unknown) {
  const issues = getValidationIssues(error)

  if (!issues.length) {
    return false
  }

  for (const issue of issues) {
    if (issue.field === 'name' || issue.field === 'email') {
      setFieldError(issue.field, issue.message)
    }
  }

  return true
}

const onSubmit = handleSubmit(async (values) => {
  savedMessage.value = ''
  submitMessage.value = ''

  try {
    const result = await updateProfile(values)
    savedMessage.value = `已保存：${result.name} / ${result.email}`
    resetForm({ values: result })
  }
  catch (error) {
    if (!applyServerValidationErrors(error)) {
      submitMessage.value = '保存失败，请稍后重试'
    }
  }
})
</script>

<template>
  <form class="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm text-slate-200" @submit="onSubmit">
    <h2 class="text-lg font-semibold text-white">
      Valibot Form
    </h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="grid gap-2">
        <span class="text-slate-300">名称</span>
        <input
          v-model="name"
          v-bind="nameProps"
          class="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white outline-none focus:border-emerald-300"
          type="text"
        >
        <span class="min-h-5 text-rose-200">{{ errors.name }}</span>
      </label>

      <label class="grid gap-2">
        <span class="text-slate-300">邮箱</span>
        <input
          v-model="email"
          v-bind="emailProps"
          class="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white outline-none focus:border-emerald-300"
          type="email"
        >
        <span class="min-h-5 text-rose-200">{{ errors.email }}</span>
      </label>
    </div>

    <div class="mt-4 flex items-center gap-3">
      <button
        class="rounded-lg bg-emerald-300 px-4 py-2 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
        type="submit"
      >
        {{ loading ? '保存中' : '保存' }}
      </button>
      <span class="text-emerald-100">{{ savedMessage }}</span>
      <span class="text-rose-200">{{ submitMessage }}</span>
    </div>
  </form>
</template>
