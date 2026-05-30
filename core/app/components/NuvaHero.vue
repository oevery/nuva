<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-950/40 backdrop-blur">
    <p class="mb-3 text-sm font-medium uppercase tracking-[0.35em] text-sky-300">
      Nuva Core Layer
    </p>
    <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
      {{ title }}
    </h1>
    <p v-if="description" class="mt-4 max-w-2xl text-base leading-7 text-slate-300">
      {{ description }}
    </p>
  </section>
</template>
