import { flushPromises, mount } from '@vue/test-utils'
import NuvaCan from '../../app/components/NuvaCan.vue'

const permission = vi.hoisted(() => ({
  anyState: vi.fn(),
  allState: vi.fn(),
  canState: vi.fn(),
  anyAsync: vi.fn(),
  allAsync: vi.fn(),
  canAsync: vi.fn(),
  hasRole: vi.fn(),
  hasScope: vi.fn(),
}))

vi.mock('../../modules/auth/runtime/composables/usePermission', () => ({
  usePermission: () => permission,
}))

describe('nuva can', () => {
  beforeEach(() => {
    permission.anyState.mockReset().mockReturnValue('deny')
    permission.allState.mockReset().mockReturnValue('allow')
    permission.canState.mockReset().mockReturnValue('allow')
    permission.anyAsync.mockReset().mockResolvedValue(false)
    permission.allAsync.mockReset().mockResolvedValue(true)
    permission.canAsync.mockReset().mockResolvedValue(true)
    permission.hasRole.mockReset().mockReturnValue(true)
    permission.hasScope.mockReset().mockReturnValue(true)
  })

  it('renders default slot when role, scope and permission pass', async () => {
    const wrapper = mount(NuvaCan, {
      props: {
        permission: ['dashboard:view', 'report:read'],
        role: 'admin',
        scope: 'organizationId',
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)
    expect(permission.allState).toHaveBeenCalledWith(['dashboard:view', 'report:read'])
    expect(permission.hasRole).toHaveBeenCalledWith('admin', 'all')
    expect(permission.hasScope).toHaveBeenCalledWith('organizationId', 'all')
  })

  it('renders fallback slot when sync permission fails', async () => {
    permission.canState.mockReturnValue('deny')

    const wrapper = mount(NuvaCan, {
      props: {
        permission: 'dashboard:view',
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true)
  })

  it('resolves unknown permission asynchronously in auto mode', async () => {
    permission.canState.mockReturnValue('unknown')
    permission.canAsync.mockResolvedValue(true)

    const wrapper = mount(NuvaCan, {
      props: {
        permission: 'dashboard:view',
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)
    await flushPromises()

    expect(permission.canAsync).toHaveBeenCalledWith('dashboard:view')
    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)
  })

  it('renders pending slot while resolving unknown permissions', async () => {
    permission.canState.mockReturnValue('unknown')
    permission.canAsync.mockResolvedValue(false)

    const wrapper = mount(NuvaCan, {
      props: {
        permission: 'dashboard:view',
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        pending: '<span data-test="pending">Checking</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    expect(wrapper.find('[data-test="pending"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)

    await flushPromises()

    expect(wrapper.find('[data-test="pending"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true)
  })

  it('can render fallback during pending checks for backwards-compatible UX', async () => {
    permission.canState.mockReturnValue('unknown')
    permission.canAsync.mockResolvedValue(true)

    const wrapper = mount(NuvaCan, {
      props: {
        permission: 'dashboard:view',
        pendingBehavior: 'fallback',
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        pending: '<span data-test="pending">Checking</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    expect(wrapper.find('[data-test="pending"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)
  })

  it('supports inverted checks', async () => {
    const wrapper = mount(NuvaCan, {
      props: {
        permission: 'dashboard:view',
        invert: true,
      },
      slots: {
        default: '<span data-test="allowed">Allowed</span>',
        fallback: '<span data-test="fallback">Denied</span>',
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="allowed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true)
  })
})
