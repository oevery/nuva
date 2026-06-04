import { useBetterAuth } from './useBetterAuth'

interface BetterAuthSessionState {
  data: unknown
  activeOrganization: unknown
  activeMember: unknown
  ready: boolean
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return
  }

  return (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
}

function getSessionData(result: unknown) {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    return null
  }

  const data = (result as { data?: unknown }).data

  if (data && typeof data === 'object' && 'value' in data) {
    return (data as { value?: unknown }).value
  }

  return data
}

function getSessionUser(session: unknown) {
  if (!session || typeof session !== 'object' || !('user' in session)) {
    return null
  }

  return (session as { user?: unknown }).user || null
}

function getDataValue<T>(result: unknown) {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    return null as T | null
  }

  const data = (result as { data?: unknown }).data

  if (data && typeof data === 'object' && 'value' in data) {
    return ((data as { value?: unknown }).value || null) as T | null
  }

  return (data || null) as T | null
}

function getSessionActiveOrganizationId(session: unknown) {
  if (!session || typeof session !== 'object') {
    return undefined
  }

  return (session as { session?: { activeOrganizationId?: string | null }, activeOrganizationId?: string | null }).activeOrganizationId
    || (session as { session?: { activeOrganizationId?: string | null } }).session?.activeOrganizationId
    || undefined
}

export function useBetterAuthSession() {
  const state = useState<BetterAuthSessionState>('nuva:better-auth-session', () => ({
    data: null,
    activeOrganization: null,
    activeMember: null,
    ready: false,
  }))

  function reset(data: unknown = null) {
    state.value.data = data
    state.value.activeOrganization = null
    state.value.activeMember = null
    state.value.ready = true
  }

  async function refresh() {
    const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const sessionFetch = ((request: Parameters<typeof useFetch>[0], options?: Parameters<typeof useFetch>[1]) => useFetch(request, {
      ...options,
      headers: requestHeaders,
    })) as typeof useFetch
    const betterAuth = useBetterAuth() as {
      useSession?: (fetcher?: typeof useFetch) => unknown
      useActiveOrganization?: (fetcher?: typeof useFetch) => unknown
      organization?: {
        getActiveMember?: () => Promise<unknown>
      }
    }

    if (!betterAuth.useSession) {
      state.value.data = null
      state.value.ready = true
      return null
    }

    try {
      const result = await betterAuth.useSession(sessionFetch)
      const data = getSessionData(result)

      if (!data) {
        reset()
        return null
      }

      const activeOrganization = betterAuth.useActiveOrganization ? getDataValue(betterAuth.useActiveOrganization(sessionFetch)) : null
      const activeMember = getSessionActiveOrganizationId(data) && betterAuth.organization?.getActiveMember
        ? getDataValue(await betterAuth.organization.getActiveMember())
        : null

      state.value.data = data
      state.value.activeOrganization = activeOrganization
      state.value.activeMember = activeMember
      state.value.ready = true
      return data
    }
    catch (error) {
      const status = getErrorStatus(error)

      if (status === 401 || status === 403) {
        reset()
        return null
      }

      throw error
    }
  }

  async function logout() {
    const betterAuth = useBetterAuth() as {
      signOut?: () => Promise<unknown> | unknown
    }

    await betterAuth.signOut?.()
    reset()
  }

  return {
    data: computed(() => state.value.data),
    user: computed(() => getSessionUser(state.value.data)),
    activeOrganization: computed(() => state.value.activeOrganization),
    activeMember: computed(() => state.value.activeMember),
    ready: computed(() => state.value.ready),
    isAuthenticated: computed(() => !!state.value.data),
    refresh,
    logout,
  }
}
