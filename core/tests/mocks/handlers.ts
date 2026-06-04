import { http, HttpResponse } from 'msw'

const profilePayload = {
  userId: 'user-1',
  name: 'Test User',
  roles: ['admin'],
  permissions: ['dashboard:view', 'report:read'],
  scope: {
    userId: 'user-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
  },
  dataAccess: {
    type: 'organization',
    values: ['org-1'],
  },
}

const permissionPayload = {
  roles: ['admin'],
  permissions: ['dashboard:view', 'report:read'],
  scope: {
    userId: 'user-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
  },
  dataAccess: {
    type: 'organization',
    values: ['org-1'],
  },
}

export const defaultHandlers = [
  http.post('https://telemetry.nuxt.com/', () => {
    return HttpResponse.json({ ok: true })
  }),
  http.get('*/api/profile', () => {
    return HttpResponse.json({
      code: 0,
      data: profilePayload,
    })
  }),
  http.get('*/api/permission', () => {
    return HttpResponse.json({
      code: 0,
      data: permissionPayload,
    })
  }),
  http.get('*/api/plain-text', () => {
    return new HttpResponse('plain-text-response', {
      headers: {
        'content-type': 'text/plain',
      },
    })
  }),
  http.get('*/api/business-error', () => {
    return HttpResponse.json({
      code: 'FAIL',
      message: 'Business failed',
      data: null,
    })
  }),
]
