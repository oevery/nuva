import type { NuvaApiConfig, NuvaAuthTokenConfig } from '../../config'
import { isSameOriginURL, normalizeSuccessCodes, resolveNuxtBaseURL } from '../../app/utils/http/config'
import { handleHttpResponse } from '../../app/utils/http/response'
import { inferResponseType, resolveResponseType } from '../../app/utils/http/response-type'
import { applyAuthHeader } from '../../app/utils/http/token'

function createMethod(meta: Record<string, unknown> = {}) {
  return {
    config: {
      headers: {},
    },
    meta,
  } as any
}

const apiConfig: NuvaApiConfig = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0,200,SUCCESS',
}

const tokenConfig: NuvaAuthTokenConfig = {
  cookieName: 'token',
  storageKey: 'token',
  header: 'Authorization',
  prefix: 'Bearer',
}

const requestURL = new URL('https://app.example.com/dashboard')

mockNuxtImport('useRequestURL', () => () => requestURL)

describe('http utils', () => {
  it('normalizes success codes from string and number inputs', () => {
    expect(normalizeSuccessCodes('0,200,SUCCESS')).toEqual([0, 200, 'SUCCESS'])
    expect(normalizeSuccessCodes(204)).toEqual([204])
  })

  it('normalizes success code arrays and falls back for invalid inputs', () => {
    expect(normalizeSuccessCodes([0, 'OK', null, {}, 204])).toEqual([0, 'OK', 204])
    expect(normalizeSuccessCodes(undefined)).toEqual([0])
  })

  it('keeps client base urls unchanged and treats same-origin checks as server-only', () => {
    expect(resolveNuxtBaseURL('/api')).toBe('/api')
    expect(resolveNuxtBaseURL('https://api.example.com/v1')).toBe('https://api.example.com/v1')
    expect(isSameOriginURL('/api/profile')).toBe(false)
    expect(isSameOriginURL('https://app.example.com/api/profile')).toBe(false)
    expect(isSameOriginURL('https://api.example.com/profile')).toBe(false)
  })

  it('infers response type from headers', () => {
    expect(inferResponseType(new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    }))).toBe('json')

    expect(inferResponseType(new Response('hello', {
      headers: { 'content-type': 'text/plain' },
    }))).toBe('text')

    expect(inferResponseType(new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'content-disposition': 'attachment; filename="a.bin"' },
    }))).toBe('blob')
  })

  it('allows method meta to override inferred response type', () => {
    const method = createMethod({ responseType: 'raw' })
    const response = new Response('ok', {
      headers: { 'content-type': 'application/json' },
    })

    expect(resolveResponseType(response, method)).toBe('raw')
  })

  it('unwraps successful api envelopes', async () => {
    const data = await handleHttpResponse(
      new Response(JSON.stringify({ code: 0, data: { ok: true } }), {
        headers: { 'content-type': 'application/json' },
      }),
      createMethod(),
      apiConfig,
    )

    expect(data).toEqual({ ok: true })
  })

  it('throws createError for business failures', async () => {
    await expect(handleHttpResponse(
      new Response(JSON.stringify({ code: 'FAIL', message: 'failed', data: null }), {
        headers: { 'content-type': 'application/json' },
      }),
      createMethod(),
      apiConfig,
    )).rejects.toMatchObject({
      statusCode: 200,
      statusMessage: 'failed',
    })
  })

  it('throws transport errors for non-ok responses', async () => {
    await expect(handleHttpResponse(
      new Response(JSON.stringify({ message: 'broken' }), {
        status: 500,
        statusText: 'Server Error',
        headers: { 'content-type': 'application/json' },
      }),
      createMethod(),
      apiConfig,
    )).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Server Error',
    })
  })

  it('returns null for 204 responses', async () => {
    const result = await handleHttpResponse(
      new Response(null, { status: 204 }),
      createMethod(),
      apiConfig,
    )

    expect(result).toBeNull()
  })

  it('applies auth header unless explicitly ignored', () => {
    const method = createMethod()
    applyAuthHeader(method, 'token-1', tokenConfig)
    expect(method.config.headers).toEqual({
      Authorization: 'Bearer token-1',
    })

    const ignored = createMethod({ ignoreToken: true })
    applyAuthHeader(ignored, 'token-2', tokenConfig)
    expect(ignored.config.headers).toEqual({})
  })
})
