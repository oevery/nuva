// @vitest-environment nuxt

import { defaultNuvaPublicConfig } from '../../config'
import { normalizeAuthRedirectTarget, useAuthRedirect } from '../../modules/auth/runtime/utils/redirect'

const { navigateToMock, route } = vi.hoisted(() => ({
  navigateToMock: vi.fn((target: unknown) => target),
  route: {
    path: '/protected',
    fullPath: '/protected?tab=1',
    query: {} as Record<string, unknown>,
  },
}))

mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('navigateTo', () => navigateToMock)

describe('auth redirect utils', () => {
  beforeEach(() => {
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
    navigateToMock.mockClear()
    route.path = '/protected'
    route.fullPath = '/protected?tab=1'
    route.query = {}
  })

  it('normalizes redirect target to local paths only', () => {
    expect(normalizeAuthRedirectTarget('/dashboard', '/')).toBe('/dashboard')
    expect(normalizeAuthRedirectTarget('https://evil.test', '/')).toBe('/')
    expect(normalizeAuthRedirectTarget(['/profile'], '/')).toBe('/profile')
  })

  it('redirects to login with current route as query', () => {
    const redirect = useAuthRedirect()
    const target = redirect.toLogin()

    expect(target).toEqual({
      path: '/login',
      query: {
        redirect: '/protected?tab=1',
      },
    })
  })

  it('avoids redirect loop on login page and handles post-login redirect', () => {
    const redirect = useAuthRedirect()
    route.path = '/login'
    expect(redirect.toLogin()).toBeUndefined()

    route.query = { redirect: '/dashboard' }
    expect(redirect.afterLogin()).toBe('/dashboard')
  })
})
