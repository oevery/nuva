import type { H3Event } from 'h3'
import type { NuvaPermissionState } from '../../../../../config'
import { createError, getCookie } from 'h3'
import { defineServerAuthAdapter, registerServerAuthAdapter } from '../../../../../modules/auth/runtime/adapters/server-registry'

interface CustomSessionUser {
  id: string
  name: string
}

export interface CustomSessionContext {
  user: CustomSessionUser
  permission: NuvaPermissionState
}

function createContext(event: H3Event): CustomSessionContext | null {
  if (getCookie(event, 'custom-session') !== 'valid') {
    return null
  }

  return {
    user: {
      id: 'custom-user',
      name: 'Custom User',
    },
    permission: {
      roles: ['admin'],
      permissions: ['dashboard:view'],
      scope: {
        organizationId: 'org-1',
      },
      dataAccess: {
        type: 'organization',
        values: ['org-1'],
      },
      source: 'adapter',
    },
  }
}

export function registerCustomSessionServerAdapter() {
  registerServerAuthAdapter('custom-session', defineServerAuthAdapter<CustomSessionContext>(() => ({
    resolveContext(event) {
      return createContext(event as H3Event)
    },
    requireAuth(event) {
      const context = createContext(event as H3Event)

      if (!context) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized',
        })
      }

      return context
    },
  })))
}
