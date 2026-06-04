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
      name: 'Endpoint User',
    },
  }
})
