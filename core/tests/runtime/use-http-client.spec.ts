import { http, HttpResponse } from 'msw'
import { createHttpClient, useHttpClient } from '../../app/composables/useHttpClient'
import { useHttpRequestHooks } from '../../app/utils/http/hooks'
import { defaultNuvaPublicConfig } from '../../config'
import { mswServer } from '../setup'

const routeUrl = new URL('http://localhost:3000/app')
const requestHeaders = { cookie: 'token=cookie-token' }
const cookieState = { value: 'cookie-token' }

mockNuxtImport('useRequestURL', () => () => routeUrl)
mockNuxtImport('useRequestHeaders', () => () => requestHeaders)
mockNuxtImport('useCookie', () => () => cookieState)

describe('useHttpClient runtime chain', () => {
  beforeEach(() => {
    useRuntimeConfig().public.nuva = structuredClone(defaultNuvaPublicConfig)
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

    expect(() => hooks.onError(new Error('network failed'))).toThrow('network failed')
    expect(() => hooks.onComplete()).not.toThrow()
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
