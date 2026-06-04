import { defaultNuvaPublicConfig } from '../../config'
import { useBetterAuth } from '../../modules/auth/runtime/composables/useBetterAuth'

const createAuthClientMock = vi.hoisted(() => vi.fn((options: unknown) => ({ options })))
const organizationClientMock = vi.hoisted(() => vi.fn((options?: unknown) => ({ plugin: 'organization', options })))

vi.mock('better-auth/vue', () => ({
  createAuthClient: createAuthClientMock,
}))

vi.mock('better-auth/client/plugins', () => ({
  organizationClient: organizationClientMock,
}))

const requestURL = new URL('https://app.example.com/dashboard')
const requestHeaders = { cookie: 'session=abc' }

mockNuxtImport('useRequestURL', () => () => requestURL)
mockNuxtImport('useRequestHeaders', () => () => requestHeaders)

describe('use better auth', () => {
  beforeEach(() => {
    clearNuxtState()
    createAuthClientMock.mockClear()
    organizationClientMock.mockClear()
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
  })

  it('creates a client with normalized base path and forwarded server cookies', () => {
    useRuntimeConfig().public.nuva.auth.betterAuth.basePath = 'auth'

    const client = useBetterAuth() as { options: any }
    const cachedClient = useBetterAuth()

    expect(client.options).toMatchObject({
      baseURL: 'https://app.example.com',
      basePath: '/auth',
      fetchOptions: {
        headers: undefined,
      },
      plugins: [],
    })
    expect(cachedClient).toBe(client)
    expect(createAuthClientMock).toHaveBeenCalledTimes(1)
    expect(organizationClientMock).not.toHaveBeenCalled()
  })

  it('enables organization plugin with dynamic access control when configured', () => {
    useRuntimeConfig().public.nuva.auth.permission.betterAuth = {
      hasPermission: true,
      organization: false,
      dynamicAccessControl: true,
    }

    const client = useBetterAuth() as { options: any }

    expect(organizationClientMock).toHaveBeenCalledWith({
      dynamicAccessControl: { enabled: true },
    })
    expect(client.options.plugins).toEqual([
      { plugin: 'organization', options: { dynamicAccessControl: { enabled: true } } },
    ])
  })
})
