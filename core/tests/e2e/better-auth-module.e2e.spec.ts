// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { fetchJsonWithRetry, fetchWithRetry } from './fetch-retry'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/better-auth', import.meta.url)),
  server: true,
  browser: false,
})

describe('better-auth module', () => {
  it('forces better-auth provider into fullstack mode and mounts handler', async () => {
    const config = await fetchJsonWithRetry('/api/runtime-config')

    expect(config.auth.provider).toBe('better-auth')
    expect(config.auth.mode).toBe('fullstack')
    expect(config.auth.betterAuth.basePath).toBe('/api/auth')

    const response = await fetchJsonWithRetry('/api/auth/session')
    expect(response).toEqual({
      ok: true,
      path: '/api/auth/session',
    })

    await expect(fetchJsonWithRetry('/api/auth/ok')).resolves.toEqual({
      ok: true,
      path: '/api/auth/ok',
    })
  })

  it('redirects protected better-auth routes when session is missing', async () => {
    const response = await fetchWithRetry('/protected', {
      redirect: 'manual',
    })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('renders protected and role-gated better-auth routes with a valid session', async () => {
    const protectedResponse = await fetchWithRetry('/protected', {
      headers: {
        cookie: 'better-session=valid',
      },
    })
    const protectedHtml = await protectedResponse.text()

    expect(protectedResponse.status).toBe(200)
    expect(protectedHtml).toContain('better-auth-protected')

    const adminResponse = await fetchWithRetry('/admin', {
      headers: {
        cookie: 'better-session=valid',
      },
    })
    const adminHtml = await adminResponse.text()

    expect(adminResponse.status).toBe(200)
    expect(adminHtml).toContain('better-auth-admin')
  })
})
