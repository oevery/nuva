import { useBetterAuthSession } from '../../modules/auth/runtime/composables/useBetterAuthSession'

const betterAuthClient = vi.hoisted(() => ({
  useSession: vi.fn(),
  useActiveOrganization: vi.fn(),
  organization: {
    getActiveMember: vi.fn(),
  },
  signOut: vi.fn(),
}))

vi.mock('../../modules/auth/runtime/composables/useBetterAuth', () => ({
  useBetterAuth: () => betterAuthClient,
}))

describe('useBetterAuthSession', () => {
  beforeEach(() => {
    clearNuxtState()
    betterAuthClient.useSession.mockReset()
    betterAuthClient.useActiveOrganization.mockReset()
    betterAuthClient.organization.getActiveMember.mockReset()
    betterAuthClient.signOut.mockReset()
  })

  it('hydrates session, user, active organization and active member', async () => {
    betterAuthClient.useSession.mockResolvedValue({
      data: {
        value: {
          user: { id: 'user-1' },
          session: { activeOrganizationId: 'org-1' },
        },
      },
    })
    betterAuthClient.useActiveOrganization.mockReturnValue({
      data: { value: { id: 'org-1', slug: 'acme' } },
    })
    betterAuthClient.organization.getActiveMember.mockResolvedValue({
      data: { value: { role: 'owner' } },
    })

    const session = useBetterAuthSession()
    const data = await session.refresh()

    expect(data).toMatchObject({ user: { id: 'user-1' } })
    expect(session.user.value).toEqual({ id: 'user-1' })
    expect(session.activeOrganization.value).toEqual({ id: 'org-1', slug: 'acme' })
    expect(session.activeMember.value).toEqual({ role: 'owner' })
    expect(session.ready.value).toBe(true)
    expect(session.isAuthenticated.value).toBe(true)
  })

  it('resets session for auth errors and after logout', async () => {
    betterAuthClient.useSession.mockRejectedValueOnce(createError({ statusCode: 401 }))

    const session = useBetterAuthSession()

    await expect(session.refresh()).resolves.toBeNull()
    expect(session.ready.value).toBe(true)
    expect(session.isAuthenticated.value).toBe(false)

    betterAuthClient.signOut.mockResolvedValue(undefined)
    await session.logout()

    expect(betterAuthClient.signOut).toHaveBeenCalledTimes(1)
    expect(session.user.value).toBeNull()
    expect(session.activeOrganization.value).toBeNull()
    expect(session.activeMember.value).toBeNull()
  })
})
