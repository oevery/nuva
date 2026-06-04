import { defaultNuvaPublicConfig, serializeNuvaRemoteRequest } from '../../config'
import { useAccessMenu } from '../../modules/auth/runtime/composables/useAccessMenu'
import { useAccessMenuState } from '../../modules/auth/runtime/composables/useAccessMenuState'
import { useNuvaAuthResolvers } from '../../modules/auth/runtime/composables/useNuvaAuthResolvers'
import { useTokenAuth } from '../../modules/auth/runtime/composables/useTokenAuth'
import { normalizeAccessMenus } from '../../modules/auth/runtime/utils/access-menu'

const routes = vi.hoisted(() => ([
  { name: 'index', path: '/', meta: {} },
  { name: 'dashboard', path: '/dashboard', meta: { auth: { permissions: ['dashboard:view'] } } },
  { name: 'users', path: '/users', meta: { auth: { roles: ['admin'] } } },
  { name: 'reports', path: '/reports', meta: { permissions: ['report:read'] } },
  { name: 'settings', path: '/settings', meta: { menu: { title: 'Settings', order: 3 }, auth: { permissions: ['settings:view'] } } },
]))

const cookieState = ref<string | null>(null)
const betterAuthClient = vi.hoisted(() => ({
  organization: {
    checkRolePermission: vi.fn(),
  },
}))

mockNuxtImport('useCookie', () => () => cookieState)

vi.mock('../../modules/auth/runtime/composables/useBetterAuth', () => ({
  useBetterAuth: () => betterAuthClient,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')

  return {
    ...actual,
    useRouter: () => ({
      getRoutes: () => routes,
    }),
  }
})

describe('useAccessMenu', () => {
  beforeEach(() => {
    clearNuxtState()
    cookieState.value = null
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    betterAuthClient.organization.checkRolePermission.mockReset().mockReturnValue(true)
    useRuntimeConfig().public.nuva = {
      ...structuredClone(defaultNuvaPublicConfig),
      auth: {
        ...structuredClone(defaultNuvaPublicConfig.auth),
        permission: {
          ...structuredClone(defaultNuvaPublicConfig.auth.permission),
          local: {
            roles: ['admin'],
            permissions: ['dashboard:view', 'report:read'],
            scope: { organizationId: 'org-1' },
            dataAccess: { type: 'organization' },
            source: 'local',
          },
        },
        accessMenu: {
          ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
          provider: 'profile',
        },
      },
    }
  })

  it('normalizes common remote menu fields', () => {
    expect(normalizeAccessMenus({
      menu: [{
        key: 'dashboard',
        label: 'Dashboard',
        url: '/dashboard',
        sort: 2,
        permission: 'dashboard:view',
        children: [{ title: 'Users', path: '/users' }],
      }],
    })).toEqual([
      expect.objectContaining({
        id: 'dashboard',
        title: 'Dashboard',
        path: '/dashboard',
        order: 2,
        permissions: ['dashboard:view'],
        children: [expect.objectContaining({ title: 'Users', path: '/users' })],
      }),
    ])
  })

  it('syncs menus from profile and prunes by routes and permissions', () => {
    const auth = useTokenAuth()
    const accessMenu = useAccessMenu()

    auth.loginWithToken('token-1', {
      id: 'user-1',
      roles: ['admin'],
      permissions: ['dashboard:view', 'report:read'],
      menus: [
        { id: 'dashboard', title: 'Dashboard', path: '/dashboard', order: 2 },
        { id: 'missing', title: 'Missing', path: '/missing' },
        { id: 'docs', title: 'Docs', path: 'https://example.com' },
        { id: 'group', title: 'Group', children: [{ id: 'users', title: 'Users', path: '/users' }] },
      ],
    })

    expect(useAccessMenuState().value.menus).toHaveLength(4)
    expect(accessMenu.menus.value.map(item => item.id)).toEqual(['docs', 'group', 'dashboard'])
    expect(accessMenu.menus.value.find(item => item.id === 'group')?.children?.map(item => item.id)).toEqual(['users'])
  })

  it('checks route meta access in strict route mode', () => {
    useRuntimeConfig().public.nuva.auth.permission.local.roles = ['viewer']
    const accessMenu = useAccessMenu()

    accessMenu.setMenus([
      { id: 'dashboard', title: 'Dashboard', path: '/dashboard' },
      { id: 'users', title: 'Users', path: '/users' },
      { id: 'reports', title: 'Reports', path: '/reports' },
    ])

    expect(accessMenu.menus.value.map(item => item.id)).toEqual(['dashboard', 'reports'])
  })

  it('loads endpoint menus through resolver and caches them', async () => {
    useRuntimeConfig().public.nuva.auth.accessMenu = {
      ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
      provider: 'endpoint',
      cacheMaxAge: 60_000,
      remote: {
        ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu.remote),
        menu: serializeNuvaRemoteRequest({ url: '/api/menus' }),
        menuResolver: true,
      },
    }
    const resolver = vi.fn(async () => ({
      routes: [{ id: 'dashboard', title: 'Dashboard', path: '/dashboard' }],
    }))
    useNuvaAuthResolvers().value.menu = resolver

    const accessMenu = useAccessMenu()

    await expect(accessMenu.ensure()).resolves.toEqual([
      expect.objectContaining({ id: 'dashboard' }),
    ])
    await accessMenu.ensure()

    expect(resolver).toHaveBeenCalledTimes(1)
  })

  it('uses the menu resolver for endpoint menus', async () => {
    useRuntimeConfig().public.nuva.auth.accessMenu = {
      ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
      provider: 'endpoint',
      remote: {
        ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu.remote),
        menu: serializeNuvaRemoteRequest({ url: '/api/menus' }),
        menuResolver: true,
      },
    }
    const menuResolver = vi.fn(async () => [{ id: 'reports', title: 'Reports', path: '/reports' }])
    useNuvaAuthResolvers().value.menu = menuResolver

    await useAccessMenu().ensure()

    expect(menuResolver).toHaveBeenCalledTimes(1)
  })

  it('can keep route menus when route pruning is disabled', () => {
    useRuntimeConfig().public.nuva.auth.accessMenu.routePrune = false
    useRuntimeConfig().public.nuva.auth.accessMenu.strictRoute = false
    const accessMenu = useAccessMenu()

    accessMenu.setMenus([{ id: 'missing', title: 'Missing', path: '/missing' }])

    expect(accessMenu.menus.value.map(item => item.id)).toEqual(['missing'])
  })

  it('warns about menus that point to missing routes in development', () => {
    const accessMenu = useAccessMenu()

    accessMenu.setMenus([{ id: 'missing', title: 'Missing', path: '/missing' }])
    accessMenu.menus.value

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('points to a route that does not exist'),
      expect.objectContaining({
        menu: expect.objectContaining({ id: 'missing' }),
      }),
    )
  })

  it('warns about menu and route permission mismatches in development', () => {
    const accessMenu = useAccessMenu()

    accessMenu.setMenus([{ id: 'dashboard', title: 'Dashboard', path: '/dashboard', permissions: ['report:read'] }])
    accessMenu.menus.value

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('permissions do not match route meta permissions'),
      expect.objectContaining({
        menu: expect.objectContaining({ id: 'dashboard' }),
        route: expect.objectContaining({ path: '/dashboard' }),
        menuAccess: ['report:read'],
        routeAccess: ['dashboard:view'],
      }),
    )
  })

  it('can build menus from route meta', () => {
    useRuntimeConfig().public.nuva.auth.accessMenu.provider = 'route'
    useRuntimeConfig().public.nuva.auth.permission.local.permissions.push('settings:view')
    const accessMenu = useAccessMenu()

    expect(accessMenu.menus.value).toEqual([
      expect.objectContaining({ id: 'settings', title: 'Settings', path: '/settings' }),
    ])
  })

  it('filters menus with better-auth dynamic permissions and active member role', () => {
    useRuntimeConfig().public.nuva.auth = {
      ...structuredClone(defaultNuvaPublicConfig.auth),
      provider: 'better-auth',
      accessMenu: {
        ...structuredClone(defaultNuvaPublicConfig.auth.accessMenu),
        provider: 'profile',
      },
      permission: {
        ...structuredClone(defaultNuvaPublicConfig.auth.permission),
        source: 'better-auth',
        betterAuth: {
          hasPermission: true,
          organization: true,
          dynamicAccessControl: false,
        },
      },
    }
    useState('nuva:better-auth-session', () => ({
      data: null,
      activeOrganization: null,
      activeMember: null,
      ready: false,
    })).value = {
      data: { user: { id: 'user-1' } },
      activeOrganization: { id: 'org-1', slug: 'acme' },
      activeMember: { role: 'viewer' },
      ready: true,
    }
    betterAuthClient.organization.checkRolePermission.mockImplementation(({ permissions }) => !!permissions.dashboard?.includes('view'))

    const accessMenu = useAccessMenu()
    accessMenu.setMenus([
      { id: 'dashboard', title: 'Dashboard', path: '/dashboard', permissions: ['dashboard:view'] },
      { id: 'reports', title: 'Reports', path: '/reports', permissions: ['report:read'] },
      { id: 'users', title: 'Users', path: '/users' },
    ])

    expect(accessMenu.menus.value.map(item => item.id)).toEqual(['dashboard'])
    expect(betterAuthClient.organization.checkRolePermission).toHaveBeenCalledWith({
      role: 'viewer',
      permissions: { dashboard: ['view'] },
    })
  })
})
