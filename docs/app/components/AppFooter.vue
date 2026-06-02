<script setup lang="ts">
const { footer } = useAppConfig()
</script>

<template>
  <UFooter class="pt-6 sm:pt-8">
    <template #left>
      {{ footer.credits }}
    </template>

    <template #right>
      <UColorModeButton v-if="footer?.colorMode" />

      <template v-if="footer?.links">
        <UButton
          v-for="(link, index) in footer.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>
  </UFooter>
</template>
