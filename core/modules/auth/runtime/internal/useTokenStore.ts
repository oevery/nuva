import { useCookie } from 'nuxt/app'
import { computed } from 'vue'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'

export function useTokenStore() {
  const config = useNuvaConfig().auth.token
  const token = useCookie<string | null>(config.cookieName)

  function setToken(value: string | null) {
    token.value = value

    if (import.meta.client && config.storageKey) {
      if (value) {
        localStorage.setItem(config.storageKey, value)
      }
      else {
        localStorage.removeItem(config.storageKey)
      }
    }
  }

  function clearToken() {
    setToken(null)
  }

  return {
    token,
    isAuthenticated: computed(() => !!token.value),
    setToken,
    clearToken,
  }
}
