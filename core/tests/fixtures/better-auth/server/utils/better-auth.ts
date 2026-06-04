export const auth = {
  handler(request: Request) {
    const url = new URL(request.url)
    const cookie = request.headers.get('cookie') || ''

    if (url.pathname === '/api/auth/get-session') {
      if (!cookie.includes('better-session=valid')) {
        return Response.json(null, { status: 401 })
      }

      return Response.json({
        user: { id: 'user-1', email: 'user@example.com' },
        session: { activeOrganizationId: 'org-1' },
      })
    }

    if (url.pathname === '/api/auth/organization/get-full-organization') {
      return Response.json({ id: 'org-1', slug: 'acme' })
    }

    if (url.pathname === '/api/auth/organization/get-active-member') {
      return Response.json({ role: 'admin' })
    }

    return Response.json({
      ok: true,
      path: url.pathname,
    })
  },
}

export default {
  auth,
}
