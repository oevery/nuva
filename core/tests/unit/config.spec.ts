import { defaultNuvaAuthConfig, defaultNuvaPublicConfig, parseNuvaRemoteRequest, serializeNuvaRemoteRequest } from '../../config'

describe('core config helpers', () => {
  it('serializes and parses remote request objects', () => {
    const request = {
      url: '/api/profile',
      method: 'POST' as const,
      params: { include: 'roles' },
    }

    expect(parseNuvaRemoteRequest(serializeNuvaRemoteRequest(request))).toEqual(request)
  })

  it('falls back to GET request when parsing a plain url', () => {
    expect(parseNuvaRemoteRequest('/api/profile')).toEqual({
      url: '/api/profile',
      method: 'GET',
    })
  })

  it('returns null for empty serialized request', () => {
    expect(parseNuvaRemoteRequest('')).toBeNull()
  })

  it('keeps auth defaults stable', () => {
    expect(defaultNuvaAuthConfig.publicRoutes).toContain(defaultNuvaAuthConfig.loginPath)
    expect(defaultNuvaAuthConfig.token.header).toBe('Authorization')
  })

  it('keeps api protocol defaults stable', () => {
    expect(defaultNuvaPublicConfig.api.response).toEqual({
      codeKey: 'code',
      messageKey: 'message',
      dataKey: 'data',
    })
    expect(defaultNuvaPublicConfig.api.pagination).toMatchObject({
      pageField: 'pageNum',
      pageSizeField: 'pageSize',
      listKey: 'list',
      totalKey: 'total',
      cleanParams: true,
    })
  })
})
