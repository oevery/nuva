import type { H3Event } from 'h3'
import type { NuvaAccessScope, NuvaPermissionMatchMode, NuvaPermissionState, NuvaResolvedAuthConfig } from '../../config'
import type { PermissionInput, PermissionLikeUser } from '../../modules/auth/runtime/utils/permission'
import { createError, defineEventHandler } from 'h3'
import { hasScope, matchList, resolvePermissionState } from '../../modules/auth/runtime/utils/permission'
import { getNuvaConfig } from './config'

interface NuvaServerAuthContext {
  permission?: NuvaPermissionState
}

interface NuvaPermissionGuardOptions {
  mode?: NuvaPermissionMatchMode
  allowLocalFallback?: boolean
}

type MaybePromise<T> = T | Promise<T>
type NuvaPermissionGuardInput = NuvaPermissionMatchMode | NuvaPermissionGuardOptions | undefined
type NuvaDataAccessType = NonNullable<NuvaPermissionState['dataAccess']>['type']
type NuvaDataAccessTarget = NuvaAccessScope & {
  ownerId?: string | number
}

interface NuvaAccessGuardOptions {
  role?: PermissionInput
  roles?: PermissionInput
  permission?: PermissionInput
  permissions?: PermissionInput
  scope?: PermissionInput
  scopes?: PermissionInput
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
}

export interface NuvaProtectedEventHandlerOptions<TAuth extends PermissionLikeUser = PermissionLikeUser> extends NuvaAccessGuardOptions {
  auth: (event: H3Event) => MaybePromise<TAuth | null | undefined>
}

export interface NuvaPermissionEventHandlerOptions<TAuth extends PermissionLikeUser = PermissionLikeUser> extends Omit<NuvaProtectedEventHandlerOptions<TAuth>, 'permission' | 'permissions'> {
  permission: PermissionInput
}

export type NuvaProtectedEventHandler<TAuth extends PermissionLikeUser = PermissionLikeUser, TResult = unknown> = (event: H3Event, auth: TAuth, permission: NuvaPermissionState) => MaybePromise<TResult>

function getNuvaServerAuthContext(event: H3Event) {
  const context = event.context as H3Event['context'] & {
    nuvaAuth?: NuvaServerAuthContext
  }

  context.nuvaAuth ||= {}
  return context.nuvaAuth
}

function createForbiddenError(message: string) {
  return createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message,
  })
}

function createUnauthorizedError() {
  return createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'Authentication is required before permission checks',
  })
}

function resolveGuardOptions(input?: NuvaPermissionGuardInput): NuvaPermissionGuardOptions {
  return typeof input === 'string' ? { mode: input } : input || {}
}

function toComparableValues(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return []
  }

  return Array.isArray(value) ? value.map(String) : [String(value)]
}

function matchesValue(allowed: unknown, target: unknown) {
  const allowedValues = new Set(toComparableValues(allowed))
  return toComparableValues(target).some(value => allowedValues.has(value))
}

function resolveScopedAccessValue(scopeValue: unknown, accessValues: unknown) {
  return toComparableValues(scopeValue).length ? scopeValue : accessValues
}

function requireNuvaAccess(event: H3Event, options: NuvaAccessGuardOptions) {
  const role = options.roles ?? options.role
  const permission = options.permissions ?? options.permission
  const scope = options.scopes ?? options.scope

  if (role) {
    requireNuvaRole(event, role, options.roleMode)
  }

  if (scope) {
    requireNuvaScope(event, scope, options.permissionMode)
  }

  if (permission) {
    requireNuvaPermission(event, permission, options.permissionMode)
  }
}

export function setNuvaAuthContext(event: H3Event, permission: NuvaPermissionState | PermissionLikeUser | null | undefined) {
  const authConfig = getNuvaConfig(event).auth as NuvaResolvedAuthConfig
  const state = resolvePermissionState(permission, authConfig.permission.local, authConfig.permission.source)

  getNuvaServerAuthContext(event).permission = state
  return state
}

export function getNuvaPermissionState(event: H3Event, options: Pick<NuvaPermissionGuardOptions, 'allowLocalFallback'> = {}) {
  const authConfig = getNuvaConfig(event).auth as NuvaResolvedAuthConfig
  const permission = getNuvaServerAuthContext(event).permission

  if (permission) {
    return permission
  }

  if (options.allowLocalFallback) {
    return authConfig.permission.local
  }

  throw createUnauthorizedError()
}

export function requireNuvaPermission(event: H3Event, permission: PermissionInput, input?: NuvaPermissionGuardInput) {
  const authConfig = getNuvaConfig(event).auth as NuvaResolvedAuthConfig
  const options = resolveGuardOptions(input)
  const state = getNuvaPermissionState(event, options)

  if (!matchList(state.permissions, permission, options.mode || authConfig.permission.permissionMode)) {
    throw createForbiddenError('Missing required permission')
  }

  return state
}

export function requireNuvaRole(event: H3Event, role: PermissionInput, input?: NuvaPermissionGuardInput) {
  const authConfig = getNuvaConfig(event).auth as NuvaResolvedAuthConfig
  const options = resolveGuardOptions(input)
  const state = getNuvaPermissionState(event, options)

  if (!matchList(state.roles, role, options.mode || authConfig.permission.roleMode)) {
    throw createForbiddenError('Missing required role')
  }

  return state
}

export function requireNuvaScope(event: H3Event, scope: PermissionInput, input?: NuvaPermissionGuardInput) {
  const options = resolveGuardOptions(input)
  const state = getNuvaPermissionState(event, options)

  if (!hasScope(state.scope, scope, options.mode || 'all')) {
    throw createForbiddenError('Missing required scope')
  }

  return state
}

export function requireNuvaDataAccessType(event: H3Event, type: NuvaDataAccessType | NuvaDataAccessType[], options: Pick<NuvaPermissionGuardOptions, 'allowLocalFallback'> = {}) {
  const state = getNuvaPermissionState(event, options)
  const types = Array.isArray(type) ? type : [type]

  if (!state.dataAccess?.type || !types.includes(state.dataAccess.type)) {
    throw createForbiddenError('Missing required data access')
  }

  return state
}

export function requireNuvaDataAccess(event: H3Event, target: NuvaDataAccessTarget, options: Pick<NuvaPermissionGuardOptions, 'allowLocalFallback'> = {}) {
  const state = getNuvaPermissionState(event, options)
  const access = state.dataAccess

  if (!access?.type) {
    throw createForbiddenError('Missing required data access')
  }

  if (access.type === 'all') {
    return state
  }

  if (access.type === 'self' && (matchesValue(state.scope?.userId, target.userId) || matchesValue(state.scope?.userId, target.ownerId))) {
    return state
  }

  if (access.type === 'tenant' && matchesValue(resolveScopedAccessValue(state.scope?.tenantId, access.values), target.tenantId)) {
    return state
  }

  if (access.type === 'organization' && matchesValue(resolveScopedAccessValue(state.scope?.organizationId, access.values), target.organizationId)) {
    return state
  }

  if (access.type === 'department' && matchesValue(resolveScopedAccessValue(state.scope?.departmentId, access.values), target.departmentId)) {
    return state
  }

  if (access.type === 'custom') {
    const targetValues = Object.values(target).flatMap(value => toComparableValues(value))
    const accessValues = toComparableValues(access.values)

    if (targetValues.some(value => accessValues.includes(value))) {
      return state
    }
  }

  throw createForbiddenError('Missing required data access')
}

export function defineProtectedHandler<TAuth extends PermissionLikeUser = PermissionLikeUser, TResult = unknown>(
  options: NuvaProtectedEventHandlerOptions<TAuth>,
  handler: NuvaProtectedEventHandler<TAuth, TResult>,
) {
  return defineEventHandler(async (event) => {
    const auth = await options.auth(event)

    if (!auth) {
      throw createUnauthorizedError()
    }

    const permission = setNuvaAuthContext(event, auth)
    requireNuvaAccess(event, options)

    return handler(event, auth, permission)
  })
}

export function definePermissionHandler<TAuth extends PermissionLikeUser = PermissionLikeUser, TResult = unknown>(
  options: NuvaPermissionEventHandlerOptions<TAuth>,
  handler: NuvaProtectedEventHandler<TAuth, TResult>,
) {
  return defineProtectedHandler(
    {
      ...options,
      permissions: options.permission,
    },
    handler,
  )
}
