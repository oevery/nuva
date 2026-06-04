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
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: {
        organizationId: 'org-1',
      },
      dataAccess: {
        type: 'organization',
        values: ['org-1'],
      },
    },
  }
})
