import type { H3Event } from 'h3'
import type { NuvaPermissionCheckContext, NuvaPermissionMatchMode } from '../../../config'
import { createError, getHeaders, getRequestURL } from 'h3'
import { defineServerAuthAdapter, registerServerAuthAdapter } from '../../auth/runtime/adapters/server-registry'
import { toBetterAuthPermissions } from '../../auth/runtime/utils/permission'
import { createBetterAuthPermissionState, getBetterAuthActiveOrganizationId } from './utils/permission-state'

interface BetterAuthLike {
  handler?: (request: Request) => Promise<Response> | Response
  api?: {
    getSession?: (input: { headers: Headers }) => Promise<unknown>
    getFullOrganization?: (input: { headers: Headers }) => Promise<unknown>
    getActiveMember?: (input: { headers: Headers }) => Promise<unknown>
    hasPermission?: (input: { headers: Headers, body: { permissions: Record<string, string[]>, context?: NuvaPermissionCheckContext } }) => Promise<unknown>
  }
}

interface BetterAuthServerAdapterOptions {
  auth: BetterAuthLike
  basePath?: string
}

function getRequestHeaders(event: H3Event) {
  return new Headers(getHeaders(event) as Record<string, string>)
}

async function readHandlerJson(auth: BetterAuthLike, event: H3Event, basePath: string, path: string) {
  if (!auth.handler) {
    return null
  }

  const url = new URL(`${basePath}${path}`, getRequestURL(event).origin)
  const response = await auth.handler(new Request(url, {
    headers: getRequestHeaders(event),
  }))

  if (!response.ok) {
    return null
  }

  return await response.json()
}

async function getSession(auth: BetterAuthLike, event: H3Event, basePath: string) {
  const headers = getRequestHeaders(event)
  return await auth.api?.getSession?.({ headers })
    || await readHandlerJson(auth, event, basePath, '/get-session')
}

async function getFullOrganization(auth: BetterAuthLike, event: H3Event, basePath: string) {
  const headers = getRequestHeaders(event)
  return await auth.api?.getFullOrganization?.({ headers })
    || await readHandlerJson(auth, event, basePath, '/organization/get-full-organization')
}

async function getActiveMember(auth: BetterAuthLike, event: H3Event, basePath: string) {
  const headers = getRequestHeaders(event)
  return await auth.api?.getActiveMember?.({ headers })
    || await readHandlerJson(auth, event, basePath, '/organization/get-active-member')
}

async function getPermissionResult(auth: BetterAuthLike, event: H3Event, basePath: string, permissions: Record<string, string[]>, context?: NuvaPermissionCheckContext) {
  const headers = getRequestHeaders(event)
  const body = context ? { permissions, context } : { permissions }

  if (auth.api?.hasPermission) {
    return await auth.api.hasPermission({
      headers,
      body,
    })
  }

  if (!auth.handler) {
    return null
  }

  const url = new URL(`${basePath}/organization/has-permission`, getRequestURL(event).origin)
  const response = await auth.handler(new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }))

  if (!response.ok) {
    return null
  }

  return await response.json()
}

function getSessionUser(session: unknown) {
  if (!session || typeof session !== 'object') {
    return null
  }

  return (session as { user?: unknown }).user || null
}

function resolvePermissionResult(result: unknown) {
  if (typeof result === 'boolean') {
    return result
  }

  if (!result || typeof result !== 'object') {
    return false
  }

  const record = result as { data?: unknown, success?: unknown, allowed?: unknown }

  if (typeof record.data === 'boolean') {
    return record.data
  }

  if (typeof record.success === 'boolean') {
    return record.success
  }

  return record.allowed === true
}

function combinePermissionResults(results: boolean[], mode: NuvaPermissionMatchMode) {
  return mode === 'any' ? results.some(Boolean) : results.every(Boolean)
}

export function registerBetterAuthServerAdapter(options: BetterAuthServerAdapterOptions) {
  registerServerAuthAdapter('better-auth', defineServerAuthAdapter(() => {
    const resolveContext = async (event: unknown) => {
      const auth = options.auth
      const h3Event = event as H3Event
      const basePath = options.basePath || '/api/auth'
      const session = await getSession(auth, h3Event, basePath) || null

      if (!session) {
        return null
      }

      const activeOrganizationId = getBetterAuthActiveOrganizationId(session)
      const activeOrganization = activeOrganizationId ? await getFullOrganization(auth, h3Event, basePath) : null
      const activeMember = activeOrganizationId ? await getActiveMember(auth, h3Event, basePath) : null
      const permission = createBetterAuthPermissionState({ session, activeOrganization, activeMember })

      return {
        session,
        user: getSessionUser(session),
        activeOrganization,
        activeMember,
        permission,
      }
    }

    return {
      resolveContext,
      async requireAuth(event) {
        const context = await resolveContext(event)

        if (!context) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'Authentication is required before permission checks',
          })
        }

        return context
      },
      permission: {
        async hasPermission(event, permission, mode, context) {
          const permissionMap = toBetterAuthPermissions(permission)

          if (!permissionMap || !Object.keys(permissionMap).length) {
            return false
          }

          const h3Event = event as H3Event
          const basePath = options.basePath || '/api/auth'

          if (mode === 'all') {
            return resolvePermissionResult(await getPermissionResult(options.auth, h3Event, basePath, permissionMap, context))
          }

          const results = await Promise.all(Object.entries(permissionMap).flatMap(([resource, actions]) => actions.map(async (action) => {
            const result = await getPermissionResult(options.auth, h3Event, basePath, { [resource]: [action] }, context)
            return resolvePermissionResult(result)
          })))

          return combinePermissionResults(results, mode)
        },
      },
    }
  }))
}
