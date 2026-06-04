<script setup lang="ts">
const nuva = useNuvaConfig()
const auth = useAuth()

definePageMeta({
  auth: {
    permissions: ['profile:read'],
  },
})

// alova NuxtHook requires `await` here to fetch during SSR and sync states to client.
const { data: profile, error: profileError } = await useProfile()
const permission = usePermission()
const canUpdateProfile = computed(() => permission.can('profile:update'))
const departmentId = computed(() => permission.scope.value?.departmentId)
const dataAccessType = computed(() => permission.dataAccess.value?.type || 'self')
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-6 py-16">
    <div class="mx-auto flex max-w-5xl flex-col gap-8">
      <NuvaHero
        title="Nuva Full-Stack Scaffold"
        description="template/ 是业务模板，继承 core/ 全栈 layer，并预置 Nuxt、alova、TailwindCSS 与 Antfu ESLint 配置。"
      />

      <AccessMenuNav />

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

      <section class="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200 sm:grid-cols-3">
        <div>
          <h2 class="text-base font-semibold text-white">
            Permission
          </h2>
          <p class="mt-2 leading-6">
            {{ canUpdateProfile ? '可编辑资料' : '只能查看资料' }}
          </p>
          <NuvaCan permission="profile:update">
            <p class="mt-2 text-emerald-200">
              NuvaCan 已放行编辑动作
            </p>
          </NuvaCan>
        </div>
        <div>
          <h2 class="text-base font-semibold text-white">
            Scope
          </h2>
          <p class="mt-2 leading-6">
            {{ departmentId || '未设置部门作用域' }}
          </p>
        </div>
        <div>
          <h2 class="text-base font-semibold text-white">
            Data Access
          </h2>
          <p class="mt-2 leading-6">
            {{ dataAccessType }}
          </p>
        </div>
      </section>

      <ClientOnly>
        <ProfileFormExample />
      </ClientOnly>
    </div>
  </main>
</template>
