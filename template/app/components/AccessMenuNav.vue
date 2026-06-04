<script setup lang="ts">
const accessMenu = useAccessMenu()
const loading = shallowRef(false)
const errorMessage = shallowRef('')

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await accessMenu.ensure()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '菜单加载失败'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <nav class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-white">
          Access Menu
        </h2>
        <p class="mt-1 text-xs text-slate-400">
          由 useAccessMenu() 根据权限过滤后渲染
        </p>
      </div>
      <span class="rounded-full border border-sky-300/30 px-2 py-1 text-xs text-sky-100">
        {{ accessMenu.menus.value.length }} items
      </span>
    </div>

    <p v-if="loading" class="rounded-xl bg-white/[0.04] px-3 py-2 text-slate-400">
      菜单加载中
    </p>
    <p v-else-if="errorMessage" class="rounded-xl bg-rose-400/10 px-3 py-2 text-rose-200">
      {{ errorMessage }}
    </p>
    <p v-else-if="!accessMenu.menus.value.length" class="rounded-xl bg-white/[0.04] px-3 py-2 text-slate-400">
      当前用户暂无可访问菜单
    </p>
    <ul v-else class="grid gap-1">
      <AccessMenuNavItem
        v-for="item in accessMenu.menus.value"
        :key="item.id || item.path || item.name || item.title"
        :item="item"
      />
    </ul>
  </nav>
</template>
