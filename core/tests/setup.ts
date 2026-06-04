import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { defaultHandlers } from './mocks/handlers'

export const mswServer = setupServer(...defaultHandlers)

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  mswServer.resetHandlers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

afterAll(() => {
  mswServer.close()
})
