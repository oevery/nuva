<script setup lang="ts">
definePageMeta({
  auth: {
    permissions: ['profile:read'],
  },
})

const { data: profile, error: profileError } = await useProfile()
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-6 py-16">
    <div class="mx-auto flex max-w-5xl flex-col gap-8">
      <NuvaHero
        title="Profile"
        description="这个页面对应远程菜单中的资料管理，并由 route meta 与菜单权限共同保护。"
      />

      <AccessMenuNav />

      <section class="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5 text-sm text-slate-200">
        <h2 class="text-lg font-semibold text-white">
          Profile Data
        </h2>
        <p v-if="profileError" class="mt-3 text-rose-200">
          {{ profileError.message }}
        </p>
        <p v-else class="mt-3 leading-6">
          {{ profile?.name }} / {{ profile?.layer }} / {{ profile?.status }}
        </p>
      </section>

      <ClientOnly>
        <ProfileFormExample />
      </ClientOnly>
    </div>
  </main>
</template>
