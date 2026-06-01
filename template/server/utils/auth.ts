import type { H3Event } from 'h3'
import type { CurrentUser } from '#shared/api/auth'

export const demoUser = {
  id: 1,
  name: 'Nuva Admin',
  roles: ['admin'],
  permissions: ['profile:read', 'profile:update'],
} satisfies CurrentUser

export const demoToken = 'nuva-demo-token'

function getTokenConfig(event: H3Event) {
  return useRuntimeConfig(event).public.nuva.auth.token
}

function normalizeTokenHeader(value: string | undefined, prefix: string) {
  if (!value) {
    return
  }

  if (!prefix) {
    return value
  }

  const pattern = new RegExp(`^${prefix}\\s+`, 'i')
  return value.replace(pattern, '')
}

export function setAuthCookie(event: H3Event, token: string) {
  const config = getTokenConfig(event)

  setCookie(event, config.cookieName, token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
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

  if (token !== demoToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '请先登录',
    })
  }
}
