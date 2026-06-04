// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { fetchJsonWithRetry, fetchWithRetry } from './fetch-retry'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/ssr-token', import.meta.url)),
  server: true,
  browser: false,
})

describe('ssr module config', () => {
  it('normalizes token auth runtime config for SSR fixture', async () => {
    const config = await fetchJsonWithRetry('/api/runtime-config')

    expect(config.auth.enabled).toBe(true)
    expect(config.auth.global).toBe(true)
    expect(config.auth.publicRoutes).toContain('/login')
    expect(config.auth.publicRoutes).toContain('/public')
    expect(new Set(config.auth.publicRoutes).size).toBe(config.auth.publicRoutes.length)
    expect(config.auth.permission.source).toBe('remote')
    expect(config.auth.permission.provider).toBe('profile')
    expect(config.auth.permission.remote.profile).toContain('/api/profile')
    expect(config.auth.permission.remote.permission).toBe('')
    expect(config.auth.permission.remote.profile).toBeTypeOf('string')
    expect(config.auth.permission.remote.permission).toBeTypeOf('string')
  })

  it('renders public SSR routes with server-rendered page content', async () => {
    const response = await fetchWithRetry('/public')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('ssr-public')
  })

  it('redirects protected SSR routes to login when token cookie is missing', async () => {
    const response = await fetchWithRetry('/protected', {
      redirect: 'manual',
    })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('renders protected SSR routes when token cookie can load remote auth state', async () => {
    const response = await fetchWithRetry('/protected', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const html = await response.text()

    if (response.status !== 200) {
      console.error(html.slice(0, 1200))
    }

    expect(response.status).toBe(200)
    expect(html).toContain('protected-page')
  })

  it('renders SSR permission routes when remote profile permissions pass', async () => {
    const response = await fetchWithRetry('/admin', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('admin-page')
  })

  it('requires token cookie for SSR remote profile endpoint', async () => {
    const rejected = await fetchWithRetry('/api/profile')
    expect(rejected.status).toBe(401)

    const accepted = await fetchWithRetry('/api/profile', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const profile = await accepted.json()

    expect(accepted.status).toBe(200)
    expect(profile.data).toMatchObject({
      id: 'user-1',
      roles: ['admin'],
      permissions: ['dashboard:view', 'report:read'],
    })
  })

  it('requires token cookie for SSR remote permission endpoint', async () => {
    const rejected = await fetchWithRetry('/api/permission')
    expect(rejected.status).toBe(401)

    const accepted = await fetchWithRetry('/api/permission', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const permission = await accepted.json()

    expect(accepted.status).toBe(200)
    expect(permission.data).toMatchObject({
      roles: ['admin'],
      permissions: ['dashboard:view', 'report:read'],
    })
  })
})
