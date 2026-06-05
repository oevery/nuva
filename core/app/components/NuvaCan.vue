<script setup lang="ts">
import type { NuvaPermissionCheckContext, NuvaPermissionMatchMode } from '../../config'
import { usePermission as useNuvaPermission } from '../../modules/auth/runtime/composables/usePermission'

interface NuvaCanProps {
  permission?: string | string[]
  role?: string | string[]
  scope?: string | string[]
  mode?: NuvaPermissionMatchMode
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
  resolve?: 'auto' | 'sync' | 'async'
  pendingBehavior?: 'hide' | 'fallback'
  context?: NuvaPermissionCheckContext
  invert?: boolean
}

const props = withDefaults(defineProps<NuvaCanProps>(), {
  mode: 'all',
  resolve: 'auto',
  pendingBehavior: 'hide',
  invert: false,
})

const permission = useNuvaPermission()
const pending = shallowRef(false)
const asyncPermissionAllowed = shallowRef(true)
let requestId = 0

function getPermissionDecision(permissionInput: string | string[], mode: NuvaPermissionMatchMode) {
  if (Array.isArray(permissionInput)) {
    return mode === 'any'
      ? permission.anyState(permissionInput)
      : permission.allState(permissionInput)
  }

  return permission.canState(permissionInput)
}

function resolvePermissionAsync(permissionInput: string | string[], mode: NuvaPermissionMatchMode, context?: NuvaPermissionCheckContext) {
  if (Array.isArray(permissionInput)) {
    return mode === 'any'
      ? permission.anyAsync(permissionInput, context)
      : permission.allAsync(permissionInput, context)
  }

  return permission.canAsync(permissionInput, context)
}

const permissionDecision = computed(() => {
  if (!props.permission || props.resolve === 'async') {
    return 'allow'
  }

  return getPermissionDecision(props.permission, props.permissionMode || props.mode)
})

const shouldResolveAsync = computed(() => {
  if (!props.permission) {
    return false
  }

  if (props.resolve === 'async') {
    return true
  }

  return props.resolve === 'auto' && permissionDecision.value === 'unknown'
})

const syncAllowed = computed(() => {
  const roleMode = props.roleMode || props.mode
  const permissionMode = props.permissionMode || props.mode
  const roleAllowed = props.role ? permission.hasRole(props.role, roleMode) : true
  const scopeAllowed = props.scope ? permission.hasScope(props.scope, permissionMode) : true
  const permissionAllowed = shouldResolveAsync.value || permissionDecision.value === 'allow'

  return roleAllowed && scopeAllowed && permissionAllowed
})

const unknown = computed(() => permissionDecision.value === 'unknown')

const allowed = computed(() => {
  if (pending.value) {
    return false
  }

  const result = syncAllowed.value && asyncPermissionAllowed.value
  return props.invert ? !result : result
})

const shouldRenderPending = computed(() => pending.value && props.pendingBehavior !== 'fallback')
const shouldRenderFallback = computed(() => !allowed.value && (!pending.value || props.pendingBehavior === 'fallback'))

watch(
  () => [props.permission, props.permissionMode, props.mode, props.resolve, props.context, permissionDecision.value] as const,
  async (_, __, onCleanup) => {
    const currentRequestId = ++requestId
    const permissionInput = props.permission
    let cancelled = false

    onCleanup(() => {
      cancelled = true
    })

    if (!permissionInput || !shouldResolveAsync.value) {
      if (currentRequestId === requestId) {
        asyncPermissionAllowed.value = true
        pending.value = false
      }
      return
    }

    pending.value = true
    asyncPermissionAllowed.value = false

    try {
      const allowed = await resolvePermissionAsync(permissionInput, props.permissionMode || props.mode, props.context)

      if (!cancelled && currentRequestId === requestId) {
        asyncPermissionAllowed.value = allowed
      }
    }
    finally {
      if (!cancelled && currentRequestId === requestId) {
        pending.value = false
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <slot v-if="allowed" :allowed="allowed" :pending="pending" :unknown="unknown" />
  <slot v-else-if="shouldRenderPending" name="pending" :allowed="allowed" :pending="pending" :unknown="unknown" />
  <slot v-else-if="shouldRenderFallback" name="fallback" :allowed="allowed" :pending="pending" :unknown="unknown" />
</template>
