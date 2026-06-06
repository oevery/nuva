import { defaultNuvaPublicConfig } from '../../config'
import { useNuvaConfig } from '../../modules/nuva/runtime/composables/useNuvaConfig'

describe('useNuvaConfig', () => {
  it('restores serialized remote requests and resolver state', () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        user: {
          ...structuredClone(defaultNuvaPublicConfig.auth.user),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.user.remote),
            request: JSON.stringify({ url: '/api/profile', method: 'POST' }),
          },
        },
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
            request: '/api/permission',
          },
        },
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu.remote),
            request: '/api/menus',
          },
        },
      },
    }

    const resolvers = useState('nuva:auth:resolvers', () => ({
      user: vi.fn(),
      permission: vi.fn(),
      menu: vi.fn(),
    }))
    const config = useNuvaConfig()

    expect(config.auth.user.remote.request).toEqual({
      url: '/api/profile',
      method: 'POST',
    })
    expect(config.auth.permission.remote.request).toEqual({
      url: '/api/permission',
      method: 'GET',
    })
    expect(config.auth.accessMenu.remote.request).toEqual({
      url: '/api/menus',
      method: 'GET',
    })
    expect(config.resolvers).toBe(resolvers.value)
  })
})
