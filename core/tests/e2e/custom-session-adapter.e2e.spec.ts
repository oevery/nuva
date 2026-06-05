// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { fetchJsonWithRetry, fetchWithRetry } from './fetch-retry'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/custom-session', import.meta.url)),
  server: true,
  browser: false,
})

describe('custom-session auth adapter', () => {
  it('redirects protected routes when session is missing', async () => {
    const response = await fetchWithRetry('/protected', {
      redirect: 'manual',
    })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('renders protected and permission-gated pages with a valid custom session', async () => {
    const protectedResponse = await fetchWithRetry('/protected', {
      headers: {
        cookie: 'custom-session=valid',
      },
    })
    const protectedHtml = await protectedResponse.text()

    expect(protectedResponse.status).toBe(200)
    expect(protectedHtml).toContain('custom-session-protected')

    const adminResponse = await fetchWithRetry('/admin', {
      headers: {
        cookie: 'custom-session=valid',
      },
    })
    const adminHtml = await adminResponse.text()

    expect(adminResponse.status).toBe(200)
    expect(adminHtml).toContain('custom-session-admin')
  })

  it('exposes registered server auth adapter context', async () => {
    const session = await fetchJsonWithRetry('/api/server-session', {
      headers: {
        cookie: 'custom-session=valid',
      },
    })

    expect(session).toEqual({
      adapter: 'custom-session',
      userId: 'custom-user',
      roles: ['admin'],
      permissions: ['dashboard:view'],
    })

    const response = await fetchWithRetry('/api/server-session')

    expect(response.status).toBe(401)
  })
})
