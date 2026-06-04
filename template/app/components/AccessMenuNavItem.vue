<script setup lang="ts">
import type { NuvaAccessMenuItem } from '@oevery/nuva/config'

const props = withDefaults(defineProps<{
  item: NuvaAccessMenuItem
  depth?: number
}>(), {
  depth: 0,
})

const route = useRoute()
const isExternal = computed(() => props.item.external || /^https?:\/\//.test(props.item.path || ''))
const to = computed(() => {
  if (isExternal.value) {
    return undefined
  }

  return props.item.path || undefined
})
const isActive = computed(() => {
  if (props.item.path) {
    return route.path === props.item.path
  }

  return props.item.name ? route.name === props.item.name : false
})
const itemStyle = computed(() => ({
  paddingLeft: `${0.75 + props.depth * 0.75}rem`,
}))
const linkClass = computed(() => [
  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
  isActive.value
    ? 'bg-sky-300 text-slate-950 shadow-lg shadow-sky-950/20'
    : 'text-slate-300 hover:bg-white/10 hover:text-white',
])
</script>

<template>
  <li>
    <a
      v-if="isExternal"
      :class="linkClass"
      :href="item.path"
      rel="noopener noreferrer"
      target="_blank"
      :style="itemStyle"
    >
      <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
      <span>{{ item.title }}</span>
    </a>

    <NuxtLink
      v-else-if="to"
      :class="linkClass"
      :style="itemStyle"
      :to="to"
    >
      <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
      <span>{{ item.title }}</span>
    </NuxtLink>

    <div
      v-else
      class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400"
      :style="itemStyle"
    >
      <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
      <span>{{ item.title }}</span>
    </div>

    <ul v-if="item.children?.length" class="mt-1 grid gap-1">
      <AccessMenuNavItem
        v-for="child in item.children"
        :key="child.id || child.path || child.name || child.title"
        :depth="depth + 1"
        :item="child"
      />
    </ul>
  </li>
</template>
