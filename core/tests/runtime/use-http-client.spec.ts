import { http, HttpResponse } from 'msw'
import { createHttpClient, useHttpClient } from '../../app/composables/useHttpClient'
import { useHttpRequestHooks } from '../../app/utils/http/hooks'
import { defaultNuvaPublicConfig } from '../../config'
import { mswServer } from '../setup'

const routeUrl = new URL('http://localhost:3000/app')
const requestHeaders = { cookie: 'token=cookie-token' }
const cookieState = { value: 'cookie-token' }
const auth = vi.hoisted(() => ({
  logout: vi.fn(),
  toLogin: vi.fn(),
}))
const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useRequestURL', () => () => routeUrl)
mockNuxtImport('useRequestHeaders', () => () => requestHeaders)
mockNuxtImport('useCookie', () => () => cookieState)
mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('../../modules/auth/runtime/composables/useAuth', () => ({
  useAuth: () => auth,
}))

describe('useHttpClient runtime chain', () => {
  beforeEach(() => {
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
    auth.logout.mockReset()
    auth.toLogin.mockReset()
    navigateToMock.mockReset()
  })

  it('adds bearer token without forwarding server cookies in client runtime', async () => {
    const seen = {
      authorization: '',
      cookie: '',
    }

    mswServer.use(
      http.get('*/api/profile', ({ request }) => {
        seen.authorization = request.headers.get('authorization') || ''
        seen.cookie = request.headers.get('cookie') || ''

        return HttpResponse.json({
          code: 0,
          data: {
            id: 'user-1',
          },
        })
      }),
    )

    const client = createHttpClient(defaultNuvaPublicConfig)
    const result = await client.Get<{ id: string }>('/api/profile')

    expect(result).toEqual({ id: 'user-1' })
    expect(seen.authorization).toBe('Bearer cookie-token')
    expect(seen.cookie).toBe('')
  })

  it('exposes default request hooks for success, error and completion flows', async () => {
    const hooks = useHttpRequestHooks(defaultNuvaPublicConfig)
    const method = {
      config: {
        headers: {},
      },
      meta: {
        ignoreToken: true,
      },
    } as any

    hooks.beforeRequest(method)
    expect(method.config.headers).toEqual({})

    await expect(hooks.onSuccess(new Response(JSON.stringify({ code: 0, data: { ok: true } }), {
      headers: { 'content-type': 'application/json' },
    }), method)).resolves.toEqual({ ok: true })

    await expect(hooks.onError(new Error('network failed'))).rejects.toThrow('network failed')
    expect(() => hooks.onComplete()).not.toThrow()
  })

  it('handles auth http errors through default hooks', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        enabled: true,
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          forbiddenPath: '/403',
        },
      },
    }
    const notify = vi.fn()
    const hooks = useHttpRequestHooks(useRuntimeConfig().public.nuva, { notify })

    await expect(hooks.onError(createError({ statusCode: 401 }))).rejects.toMatchObject({ statusCode: 401 })
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(auth.toLogin).toHaveBeenCalledTimes(1)

    await expect(hooks.onError(createError({ statusCode: 403 }))).rejects.toMatchObject({ statusCode: 403 })
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      message: '无权限执行该操作',
      status: 403,
    }))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('supports request-level 403 behavior and error message overrides', async () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        enabled: true,
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          forbiddenPath: '/403',
        },
      },
    }
    const notify = vi.fn()
    const hooks = useHttpRequestHooks(useRuntimeConfig().public.nuva, { notify })
    const notifyMethod = { meta: { errorMessage: '你没有编辑资料的权限' } } as any
    const redirectMethod = { meta: { forbiddenBehavior: 'redirect' } } as any
    const silentMethod = { meta: { forbiddenBehavior: 'silent' } } as any

    await expect(hooks.onError(createError({ statusCode: 403, statusMessage: 'Forbidden' }), notifyMethod)).rejects.toMatchObject({ statusCode: 403 })
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      message: '你没有编辑资料的权限',
      method: notifyMethod,
      status: 403,
    }))

    await expect(hooks.onError(createError({ statusCode: 403 }), redirectMethod)).rejects.toMatchObject({ statusCode: 403 })
    expect(navigateToMock).toHaveBeenCalledWith('/403')

    notify.mockClear()
    await expect(hooks.onError(createError({ statusCode: 403 }), silentMethod)).rejects.toMatchObject({ statusCode: 403 })
    expect(notify).not.toHaveBeenCalled()
  })

  it('supports non-json responses and business errors', async () => {
    const client = createHttpClient(defaultNuvaPublicConfig)

    const text = await client.Get<string>('/api/plain-text')
    expect(text).toBe('plain-text-response')

    await expect(client.Get('/api/business-error')).rejects.toMatchObject({
      statusCode: 200,
      statusMessage: 'Business failed',
    })
  })

  it('reuses cached clients until runtime config changes the cache key', () => {
    const firstClient = useHttpClient()
    const secondClient = useHttpClient()

    expect(secondClient).toBe(firstClient)

    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      api: {
        ...structuredClone(defaultNuvaPublicConfig.api),
        successCodes: '0,200',
      },
    }

    expect(useHttpClient()).not.toBe(firstClient)
  })
})
