import { defaultNuvaPublicConfig } from '../../config'
import { useNuvaConfig } from '../../modules/nuva/runtime/composables/useNuvaConfig'

describe('useNuvaConfig', () => {
  it('restores serialized remote requests and resolver state', () => {
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.permission.remote),
            profile: JSON.stringify({ url: '/api/profile', method: 'POST' }),
            permission: '/api/permission',
          },
        },
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          remote: {
            ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu.remote),
            menu: '/api/menus',
          },
        },
      },
    }

    const resolvers = useState('nuva:auth:resolvers', () => ({
      profile: vi.fn(),
      permission: vi.fn(),
      menu: vi.fn(),
    }))
    const config = useNuvaConfig()

    expect(config.auth.permission.remote.profile).toEqual({
      url: '/api/profile',
      method: 'POST',
    })
    expect(config.auth.permission.remote.permission).toEqual({
      url: '/api/permission',
      method: 'GET',
    })
    expect(config.auth.accessMenu.remote.menu).toEqual({
      url: '/api/menus',
      method: 'GET',
    })
    expect(config.resolvers).toBe(resolvers.value)
  })
})
