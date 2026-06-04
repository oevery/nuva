import type { H3Event } from 'h3'
import type { CurrentUser } from '#shared/api/auth'
import { Buffer } from 'node:buffer'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { env } from 'node:process'
import { setNuvaAuthContext } from '@oevery/nuva/server/utils/permission'

export const demoUser = {
  id: 1,
  name: 'Nuva Admin',
  roles: ['admin'],
  permissions: ['profile:read', 'profile:update', 'dashboard:read'],
  scope: {
    tenantId: 'tenant-demo',
    organizationId: 'org-demo',
    departmentId: 'dept-product',
  },
  dataAccess: {
    type: 'department',
    values: ['dept-product'],
  },
  source: 'remote',
} satisfies CurrentUser

const demoAuthMaxAge = 60 * 60 * 24 * 7
const defaultDemoUsername = 'admin'
const defaultDemoPassword = 'admin123456'
const insecureDemoSecret = 'nuva-demo-auth-secret'
const loginRateLimitWindow = 60 * 1000
const loginRateLimitMax = 5
const loginAttempts = new Map<string, { count: number, expiresAt: number }>()

function getTokenConfig(event: H3Event) {
  return useRuntimeConfig(event).public.nuva.auth.token
}

function getDemoAuthSecret() {
  const secret = env.NUVA_DEMO_AUTH_SECRET?.trim()

  if (secret) {
    if (env.NODE_ENV === 'production' && secret.length < 32) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Demo auth secret is too weak',
        message: '生产环境 NUVA_DEMO_AUTH_SECRET 至少需要 32 个字符。',
      })
    }

    return secret
  }

  if (env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Demo auth secret is not configured',
      message: '请设置环境变量 NUVA_DEMO_AUTH_SECRET，或移除 demo auth 模板。',
    })
  }

  return insecureDemoSecret
}

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: demoAuthMaxAge,
    path: '/',
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
  }
}

function getDeleteAuthCookieOptions() {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions()
  return options
}

function getRequestOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')

  if (origin) {
    return origin
  }

  const referer = getHeader(event, 'referer')

  if (!referer) {
    return
  }

  try {
    return new URL(referer).origin
  }
  catch {

  }
}

export function assertSameOriginRequest(event: H3Event) {
  const method = getMethod(event).toUpperCase()

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return
  }

  const fetchSite = getHeader(event, 'sec-fetch-site')

  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: '跨站请求已被拒绝',
    })
  }

  const requestOrigin = getRequestOrigin(event)

  if (requestOrigin && requestOrigin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: '跨源请求已被拒绝',
    })
  }
}

function getClientRateLimitKey(event: H3Event) {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || getHeader(event, 'x-real-ip') || 'local'
}

export function assertDemoLoginRateLimit(event: H3Event) {
  const key = getClientRateLimitKey(event)
  const now = Date.now()
  const current = loginAttempts.get(key)

  if (!current || current.expiresAt <= now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + loginRateLimitWindow })
    return
  }

  if (current.count >= loginRateLimitMax) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: '登录尝试过于频繁，请稍后再试。',
    })
  }

  current.count += 1
}

export function clearDemoLoginRateLimit(event: H3Event) {
  loginAttempts.delete(getClientRateLimitKey(event))
}

function getDemoCredentials() {
  return {
    username: env.NUVA_DEMO_AUTH_USERNAME?.trim() || defaultDemoUsername,
    password: env.NUVA_DEMO_AUTH_PASSWORD || defaultDemoPassword,
  }
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signDemoPayload(payload: string) {
  return createHmac('sha256', getDemoAuthSecret())
    .update(payload)
    .digest('base64url')
}

function isValidSignature(payload: string, signature: string) {
  const expected = signDemoPayload(payload)

  if (expected.length !== signature.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function createDemoToken() {
  const payload = encodeBase64Url(JSON.stringify({
    sub: String(demoUser.id),
    exp: Date.now() + demoAuthMaxAge * 1000,
    nonce: randomUUID(),
  }))

  return `${payload}.${signDemoPayload(payload)}`
}

export function validateDemoCredentials(username: string, password: string) {
  const credentials = getDemoCredentials()
  return username === credentials.username && password === credentials.password
}

function verifyDemoToken(token: string) {
  const [payload, signature] = token.split('.')

  if (!payload || !signature || !isValidSignature(payload, signature)) {
    return false
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as {
      sub?: string
      exp?: number
    }

    return parsed.sub === String(demoUser.id)
      && typeof parsed.exp === 'number'
      && parsed.exp > Date.now()
  }
  catch {
    return false
  }
}

function normalizeTokenHeader(value: string | undefined, prefix: string) {
  if (!value) {
    return
  }

  const token = value.trim()
  const normalizedPrefix = prefix.trim()

  if (!normalizedPrefix) {
    return token
  }

  const prefixWithSpace = `${normalizedPrefix} `

  if (!token.toLowerCase().startsWith(prefixWithSpace.toLowerCase())) {
    return
  }

  return token.slice(prefixWithSpace.length).trimStart()
}

export function setAuthCookie(event: H3Event, token: string) {
  const config = getTokenConfig(event)

  setCookie(event, config.cookieName, token, getAuthCookieOptions())
}

export function clearAuthCookie(event: H3Event) {
  const config = getTokenConfig(event)

  deleteCookie(event, config.cookieName, getDeleteAuthCookieOptions())
}

export function requireAuth(event: H3Event) {
  const config = getTokenConfig(event)
  const header = getHeader(event, config.header)
  const token = normalizeTokenHeader(header, config.prefix) || getCookie(event, config.cookieName)

  if (!token || !verifyDemoToken(token)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '请先登录',
    })
  }

  setNuvaAuthContext(event, demoUser)
  return demoUser
}
