import type { NuvaPermissionDecision, NuvaPermissionState } from '../../../../../config'
import { defineAuthAdapter, registerAuthAdapter } from '../../../../../modules/auth/runtime/adapters/registry'

interface CustomSessionUser {
  id: string
  name: string
}

function createPermissionState(): NuvaPermissionState {
  return {
    roles: ['admin'],
    permissions: ['dashboard:view'],
    scope: {
      organizationId: 'org-1',
    },
    dataAccess: {
      type: 'organization',
      values: ['org-1'],
    },
    source: 'adapter',
  }
}

function createEmptyPermissionState(): NuvaPermissionState {
  return {
    roles: [],
    permissions: [],
    scope: {},
    dataAccess: { type: 'self' },
    source: 'adapter',
  }
}

function toDecision(allowed: boolean): NuvaPermissionDecision {
  return allowed ? 'allow' : 'deny'
}

export default defineNuxtPlugin(() => {
  registerAuthAdapter('custom-session', defineAuthAdapter<CustomSessionUser>(() => {
    const session = useCookie<string | null>('custom-session')
    const userState = useState<CustomSessionUser | null>('custom-session:user', () => null)
    const readyState = useState('custom-session:ready', () => false)
    const user = computed(() => userState.value)
    const ready = computed(() => readyState.value)
    const isAuthenticated = computed(() => !!userState.value)
    const permissionState = computed(() => userState.value ? createPermissionState() : createEmptyPermissionState())

    async function ensureAuthenticated() {
      const authenticated = session.value === 'valid'

      userState.value = authenticated
        ? { id: 'custom-user', name: 'Custom User' }
        : null
      readyState.value = true

      return authenticated
    }

    async function refreshPermission() {
      await ensureAuthenticated()
      return permissionState.value
    }

    function canState(permission: string) {
      return toDecision(permissionState.value.permissions.includes(permission))
    }

    async function canAsync(permission: string) {
      return canState(permission) === 'allow'
    }

    async function anyAsync(permissions: string[]) {
      return permissions.some(permission => permissionState.value.permissions.includes(permission))
    }

    async function allAsync(permissions: string[]) {
      return permissions.every(permission => permissionState.value.permissions.includes(permission))
    }

    return {
      user,
      ready,
      isAuthenticated,
      ensureAuthenticated,
      logout() {
        session.value = null
        userState.value = null
        readyState.value = true
      },
      permission: {
        authReady: ready,
        loaded: ready,
        state: permissionState,
        refresh: refreshPermission,
        ensure: refreshPermission,
        canState,
        canAsync,
        anyAsync,
        allAsync,
      },
    }
  }))
})
