<script setup lang="ts">
// alova NuxtHook requires `await` here to fetch during SSR and sync states to client.
const { data: profile, error: profileError } = await useProfile()
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-6 py-16">
    <div class="mx-auto flex max-w-5xl flex-col gap-8">
      <NuvaHero
        title="Nuva Full-Stack Scaffold"
        description="template/ 是业务模板，继承 core/ 全栈 layer，并预置 Nuxt、alova、TailwindCSS 与 Antfu ESLint 配置。"
      />

      <section class="grid gap-4 sm:grid-cols-3">
        <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 class="text-lg font-semibold text-white">
            Nuxt Layer
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">
            core/ 提供共享组件、组合式函数、服务端 API 与工具函数。
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 class="text-lg font-semibold text-white">
            alova Client
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">
            useHttpClient() 统一创建业务请求客户端，并通过 alova/nuxt 同步 SSR states。
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 class="text-lg font-semibold text-white">
            TailwindCSS
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">
            template/ 扫描自身和 core/，确保 layer 组件样式被生成。
          </p>
        </article>
      </section>

      <section class="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5 text-sm text-slate-200">
        <h2 class="text-lg font-semibold text-white">
          alova SSR Data
        </h2>
        <p v-if="profileError" class="mt-3 text-rose-200">
          {{ profileError.message }}
        </p>
        <p v-else class="mt-3 leading-6">
          {{ profile?.name }} / {{ profile?.layer }} / {{ profile?.status }}
        </p>
      </section>
    </div>
  </main>
</template>
