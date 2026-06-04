export default defineEventHandler((event) => {
  const token = getCookie(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  return {
    code: 0,
    data: {
      id: 'user-1',
      roles: ['admin'],
      permissions: ['dashboard:view', 'report:read'],
      scope: {
        userId: 'user-1',
        organizationId: 'org-1',
      },
      dataAccess: {
        type: 'organization',
        values: ['org-1'],
      },
    },
  }
})
