<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[] | undefined>>('navigation')
const { header } = useAppConfig()
const route = useRoute()

const navLinks = computed(() => (header?.nav ?? []).map(link => ({
  ...link,
  active: link.to === '/' ? route.path === '/' : route.path.startsWith(link.to),
})))
</script>

<template>
  <UHeader
    :ui="{ center: 'flex-1' }"
  >
    <div class="hidden flex-1 items-center gap-2 lg:flex">
      <UButton
        v-for="link in navLinks"
        :key="link.to"
        v-bind="link"
        :color="link.active ? 'primary' : 'neutral'"
        variant="ghost"
      />

      <UContentSearchButton
        v-if="header?.search"
        :collapsed="false"
        class="ml-auto max-w-xs flex-1"
      />
    </div>

    <template #left>
      <NuxtLink
        :to="header?.to || '/'"
        aria-label="Nuva Docs"
      >
        <AppLogo />
      </NuxtLink>
    </template>

    <template #right>
      <UContentSearchButton
        v-if="header?.search"
        class="lg:hidden"
      />

      <UColorModeButton v-if="header?.colorMode" />

      <template v-if="header?.links">
        <UButton
          v-for="(link, index) in header.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid gap-1">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            v-bind="link"
            :color="link.active ? 'primary' : 'neutral'"
            variant="ghost"
            block
          />
        </div>

        <USeparator />

        <UContentNavigation
          highlight
          :navigation="navigation"
        />
      </div>
    </template>
  </UHeader>
</template>
