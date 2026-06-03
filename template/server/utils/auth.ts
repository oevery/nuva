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

function getTokenConfig(event: H3Event) {
  return useRuntimeConfig(event).public.nuva.auth.token
}

function getDemoAuthSecret() {
  const secret = env.NUVA_DEMO_AUTH_SECRET?.trim()

  if (secret) {
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

  setCookie(event, config.cookieName, token, {
    httpOnly: true,
    maxAge: demoAuthMaxAge,
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  })
}

export function clearAuthCookie(event: H3Event) {
  const config = getTokenConfig(event)

  deleteCookie(event, config.cookieName, { path: '/' })
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
