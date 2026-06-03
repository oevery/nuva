<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot'
import { loginFormSchema } from '#shared/api/auth'

definePageMeta({
  layout: false,
  auth: false,
})

const nuva = useNuvaConfig()
const auth = useAuth()
const { send: login, loading } = useLogin()
const { defineField, errors, handleSubmit } = useForm({
  validationSchema: toTypedSchema(loginFormSchema),
  initialValues: {
    username: 'admin',
    password: 'admin123456',
  },
})

const [username, usernameProps] = defineField('username')
const [password, passwordProps] = defineField('password')
const submitMessage = shallowRef('')
const { afterLogin } = auth

const onSubmit = handleSubmit(async (values) => {
  submitMessage.value = ''

  try {
    await login(values)

    await afterLogin()
  }
  catch (error) {
    submitMessage.value = error instanceof Error ? error.message : '登录失败'
  }
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
    <form class="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-sky-950/30" @submit="onSubmit">
      <div class="mb-6">
        <p class="text-sm font-medium uppercase tracking-[0.24em] text-sky-300">
          Nuva Auth
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-white">
          登录
        </h1>
        <p class="mt-2 text-sm leading-6 text-slate-300">
          当前使用 frontend demo token 登录。
        </p>
      </div>

      <label class="block text-sm font-medium text-slate-200" for="username">用户名</label>
      <input
        id="username"
        v-model="username"
        v-bind="usernameProps"
        class="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-sky-400/30 transition focus:border-sky-300 focus:ring-4"
        autocomplete="username"
      >
      <p class="mt-2 min-h-5 text-sm text-rose-200">
        {{ errors.username }}
      </p>

      <label class="mt-4 block text-sm font-medium text-slate-200" for="password">密码</label>
      <input
        id="password"
        v-model="password"
        v-bind="passwordProps"
        class="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-sky-400/30 transition focus:border-sky-300 focus:ring-4"
        type="password"
        autocomplete="current-password"
      >
      <p class="mt-2 min-h-5 text-sm text-rose-200">
        {{ errors.password }}
      </p>

      <button
        class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        :disabled="loading"
      >
        <Icon name="lucide:log-in" class="size-4" />
        {{ loading ? '登录中' : '登录' }}
      </button>

      <p class="mt-4 min-h-5 text-sm text-rose-200">
        {{ submitMessage }}
      </p>
    </form>
  </main>
</template>
