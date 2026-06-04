import { defaultNuvaAuthConfig } from '../../config'
import { fetchRemotePermission, fetchRemoteUser, toPermissionState } from '../../modules/auth/runtime/utils/remote'

const httpClient = vi.hoisted(() => ({
  Get: vi.fn(),
  Post: vi.fn(),
  Put: vi.fn(),
  Patch: vi.fn(),
  Delete: vi.fn(),
}))

mockNuxtImport('useHttpClient', () => () => httpClient)

describe('remote auth utils', () => {
  beforeEach(() => {
    httpClient.Get.mockReset()
    httpClient.Post.mockReset()
    httpClient.Put.mockReset()
    httpClient.Patch.mockReset()
    httpClient.Delete.mockReset()
  })

  it('executes remote requests through resolver context helpers', async () => {
    httpClient.Post.mockResolvedValue({ id: 'user-1' })
    const resolver = vi.fn(async context => context.requestWith({
      url: '/api/profile',
      method: 'POST',
      data: { token: 'token-1' },
      params: { expand: 'permission' },
      headers: { 'x-test': '1' },
      meta: { ignoreToken: true },
    }))

    const user = await fetchRemoteUser(defaultNuvaAuthConfig as any, { url: '/api/profile' }, resolver)

    expect(user).toEqual({ id: 'user-1' })
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({
      request: { url: '/api/profile' },
      config: defaultNuvaAuthConfig,
    }))
    expect(httpClient.Post).toHaveBeenCalledWith('http://localhost:3000/api/profile', { token: 'token-1' }, {
      params: { expand: 'permission' },
      headers: { 'x-test': '1' },
      meta: { ignoreToken: true },
    })
  })

  it('uses the configured HTTP method when no resolver is provided', async () => {
    httpClient.Delete.mockResolvedValue({ roles: ['admin'], permissions: [] })

    await fetchRemotePermission(defaultNuvaAuthConfig as any, {
      url: '/api/permission',
      method: 'DELETE',
      data: { id: 'permission-1' },
    }, null)

    expect(httpClient.Delete).toHaveBeenCalledWith('http://localhost:3000/api/permission', { id: 'permission-1' }, {
      params: undefined,
      headers: undefined,
      meta: undefined,
    })
  })

  it('throws for missing remote request and normalizes permission payloads', async () => {
    await expect(fetchRemoteUser(defaultNuvaAuthConfig as any, null, null)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Nuva remote request is not configured',
    })

    expect(toPermissionState(null, defaultNuvaAuthConfig as any)).toMatchObject({
      roles: [],
      permissions: [],
      source: 'local',
    })
  })
})
