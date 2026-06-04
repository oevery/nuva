<script setup lang="ts">
definePageMeta({
  auth: {
    roles: ['admin'],
    permissions: ['dashboard:view'],
  },
})
</script>

<template>
  <div>admin-page</div>
</template>
