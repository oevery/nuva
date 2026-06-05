import type { ComputedRef } from 'vue'
import type { NuvaPermissionCheckContext, NuvaPermissionDecision, NuvaPermissionState } from '../../../../config'
import { resetServerAuthAdapters } from './server-registry'
import { createTokenAuthAdapter } from './token'

export type { NuvaAuthServerAdapter, NuvaAuthServerAdapterCore, NuvaAuthServerAdapterFactory } from './server-registry'
export { defineServerAuthAdapter, registerServerAuthAdapter, useServerAuthAdapter } from './server-registry'

export interface NuvaAuthPermissionAdapter {
  authReady?: ComputedRef<boolean>
  loaded?: ComputedRef<boolean>
  state?: ComputedRef<NuvaPermissionState>
  refresh?: () => Promise<NuvaPermissionState> | NuvaPermissionState
  ensure?: () => Promise<NuvaPermissionState> | NuvaPermissionState
  canState?: (permission: string) => NuvaPermissionDecision
  canAsync?: (permission: string, context?: NuvaPermissionCheckContext) => Promise<boolean> | boolean
  anyAsync?: (permissions: string[], context?: NuvaPermissionCheckContext) => Promise<boolean> | boolean
  allAsync?: (permissions: string[], context?: NuvaPermissionCheckContext) => Promise<boolean> | boolean
}

export interface NuvaAuthAdapterCore<TUser = unknown> {
  user: ComputedRef<TUser | null>
  ready: ComputedRef<boolean>
  isAuthenticated: ComputedRef<boolean>
  logout: () => Promise<void> | void
  ensureAuthenticated?: () => Promise<boolean> | boolean
  permission?: NuvaAuthPermissionAdapter
}

export type NuvaAuthAdapter<TUser = unknown> = NuvaAuthAdapterCore<TUser> & {
  readonly name: string
}

export type NuvaAuthAdapterFactory<TUser = unknown> = () => NuvaAuthAdapterCore<TUser>

const adapters = new Map<string, NuvaAuthAdapterFactory>()

export function defineAuthAdapter<TUser = unknown>(factory: NuvaAuthAdapterFactory<TUser>) {
  return factory
}

export function registerAuthAdapter<TUser = unknown>(name: string, factory: NuvaAuthAdapterFactory<TUser>) {
  adapters.set(name, factory as NuvaAuthAdapterFactory)
}

export function resetAuthAdapters() {
  adapters.clear()
  resetServerAuthAdapters()
}

function withAdapterName<TAdapter extends object>(name: string, adapter: TAdapter): TAdapter & { readonly name: string } {
  return {
    ...adapter,
    name,
  }
}

export function useAuthAdapter<TUser = unknown>(name: string): NuvaAuthAdapter<TUser> {
  if (name === 'token') {
    return withAdapterName(name, createTokenAuthAdapter<TUser>())
  }

  const factory = adapters.get(name)

  if (!factory) {
    throw createError({
      statusCode: 500,
      statusMessage: `Nuva auth adapter "${name}" is not registered`,
      message: `Register a Nuva auth adapter for provider "${name}" before using auth runtime APIs. If this provider has a Nuva module, add that module instead of @oevery/nuva/auth.`,
    })
  }

  return withAdapterName(name, factory() as NuvaAuthAdapterCore<TUser>)
}
