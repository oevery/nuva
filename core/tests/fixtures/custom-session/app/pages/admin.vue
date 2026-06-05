<script setup lang="ts">
definePageMeta({
  auth: {
    roles: ['admin'],
    permissions: ['dashboard:view'],
  },
})
</script>

<template>
  <div>custom-session-admin</div>
</template>
