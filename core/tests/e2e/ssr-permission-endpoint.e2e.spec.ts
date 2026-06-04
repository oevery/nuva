// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { fetchWithRetry } from './fetch-retry'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/ssr-token-permission', import.meta.url)),
  server: true,
  browser: false,
})

describe('ssr token permission endpoint', () => {
  it('renders protected page from profile-only getInfo and separate permission endpoint', async () => {
    const response = await fetchWithRetry('/protected', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('permission-protected')
  })

  it('renders permission page after loading roles and permissions from endpoint', async () => {
    const response = await fetchWithRetry('/admin', {
      headers: {
        cookie: 'token=server-token',
      },
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('permission-admin')
  })
})
