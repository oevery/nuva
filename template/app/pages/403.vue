<script setup lang="ts">
definePageMeta({
  auth: false,
})

const loginPath = useRuntimeConfig().public.nuva.auth.loginPath
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
    <section class="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-sky-950/30">
      <p class="text-sm font-medium uppercase tracking-[0.24em] text-rose-300">
        Forbidden
      </p>
      <h1 class="mt-3 text-3xl font-semibold text-white">
        无权限访问
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-300">
        当前账号缺少访问该页面所需的角色、权限或作用域。
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <NuxtLink class="inline-flex rounded-lg bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200" :to="loginPath">
          重新登录
        </NuxtLink>
        <NuxtLink class="inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" to="/">
          返回首页
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
