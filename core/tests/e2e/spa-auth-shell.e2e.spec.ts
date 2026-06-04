// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { fetchWithRetry } from './fetch-retry'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/spa-token', import.meta.url)),
  server: true,
  browser: false,
})

describe('spa auth shell', () => {
  it('serves SPA protected route shell in client-only fixture', async () => {
    const response = await fetchWithRetry('/protected')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('__NUXT__')
    expect(html).not.toContain('spa-protected')
  })

  it('serves SPA public login shell without SSR page content', async () => {
    const response = await fetchWithRetry('/login')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('__NUXT__')
    expect(html).not.toContain('spa-login')
  })
})
