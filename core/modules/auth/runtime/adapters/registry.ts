import type { ComputedRef } from 'vue'
import type { NuvaAccessMenuItem, NuvaPermissionCheckContext, NuvaPermissionDecision, NuvaPermissionState } from '../../../../config'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { createLocalAccessMenuAdapter, createRemoteAccessMenuAdapter, createRouteAccessMenuAdapter } from './access-menu'
import { createLocalPermissionAdapter, createRemotePermissionAdapter } from './permission'
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

export interface NuvaAccessMenuAdapterCore {
  menus: ComputedRef<NuvaAccessMenuItem[]>
  rawMenus?: ComputedRef<NuvaAccessMenuItem[]>
  loaded: ComputedRef<boolean>
  setMenus?: (items: unknown) => void
  clearMenus?: () => void
  refresh?: () => Promise<NuvaAccessMenuItem[]> | NuvaAccessMenuItem[]
  ensure?: () => Promise<NuvaAccessMenuItem[]> | NuvaAccessMenuItem[]
}

export type NuvaPermissionAdapter = NuvaAuthPermissionAdapter & {
  readonly name: string
}

export type NuvaAccessMenuAdapter = NuvaAccessMenuAdapterCore & {
  readonly name: string
}

export type NuvaPermissionAdapterFactory = () => NuvaAuthPermissionAdapter
export type NuvaAccessMenuAdapterFactory = () => NuvaAccessMenuAdapterCore

export interface NuvaAuthAdapterCore<TUser = unknown> {
  user: ComputedRef<TUser | null>
  ready: ComputedRef<boolean>
  isAuthenticated: ComputedRef<boolean>
  logout: () => Promise<void> | void
  ensureAuthenticated?: () => Promise<boolean> | boolean
  permission?: NuvaAuthPermissionAdapter
  accessMenu?: NuvaAccessMenuAdapterCore
}

export type NuvaAuthAdapter<TUser = unknown> = NuvaAuthAdapterCore<TUser> & {
  readonly name: string
}

export type NuvaAuthAdapterFactory<TUser = unknown> = () => NuvaAuthAdapterCore<TUser>

const adapters = new Map<string, NuvaAuthAdapterFactory>()
const permissionAdapters = new Map<string, NuvaPermissionAdapterFactory>()
const accessMenuAdapters = new Map<string, NuvaAccessMenuAdapterFactory>()

export function defineAuthAdapter<TUser = unknown>(factory: NuvaAuthAdapterFactory<TUser>) {
  return factory
}

export function registerAuthAdapter<TUser = unknown>(name: string, factory: NuvaAuthAdapterFactory<TUser>) {
  adapters.set(name, factory as NuvaAuthAdapterFactory)
}

export function definePermissionAdapter(factory: NuvaPermissionAdapterFactory) {
  return factory
}

export function registerPermissionAdapter(name: string, factory: NuvaPermissionAdapterFactory) {
  permissionAdapters.set(name, factory)
}

export function defineAccessMenuAdapter(factory: NuvaAccessMenuAdapterFactory) {
  return factory
}

export function registerAccessMenuAdapter(name: string, factory: NuvaAccessMenuAdapterFactory) {
  accessMenuAdapters.set(name, factory)
}

export function resetAuthAdapters() {
  adapters.clear()
  permissionAdapters.clear()
  accessMenuAdapters.clear()
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

export function usePermissionAdapter(name: string): NuvaPermissionAdapter | null {
  if (name === 'local') {
    return withAdapterName(name, createLocalPermissionAdapter())
  }

  if (name === 'remote') {
    return withAdapterName(name, createRemotePermissionAdapter())
  }

  if (name === 'adapter') {
    const provider = useNuvaConfig().auth.provider
    const adapterPermission = useAuthAdapter(provider).permission
    return adapterPermission ? withAdapterName(name, adapterPermission) : null
  }

  const factory = permissionAdapters.get(name)

  return factory ? withAdapterName(name, factory()) : null
}

export function useAccessMenuAdapter(name: string): NuvaAccessMenuAdapter | null {
  if (name === 'route') {
    return withAdapterName(name, createRouteAccessMenuAdapter())
  }

  if (name === 'local') {
    return withAdapterName(name, createLocalAccessMenuAdapter())
  }

  if (name === 'remote') {
    return withAdapterName(name, createRemoteAccessMenuAdapter())
  }

  if (name === 'adapter') {
    const authConfig = useNuvaConfig().auth
    const hasExplicitAdapter = !!authConfig.accessMenu.adapter
    const adapterName = authConfig.accessMenu.adapter || authConfig.provider
    const providerFactory = accessMenuAdapters.get(adapterName)

    if (hasExplicitAdapter) {
      return providerFactory ? withAdapterName(adapterName, providerFactory()) : null
    }

    const authAdapter = useAuthAdapter(authConfig.provider)

    if (authAdapter.accessMenu) {
      return withAdapterName(adapterName, authAdapter.accessMenu)
    }

    return providerFactory ? withAdapterName(adapterName, providerFactory()) : null
  }

  const factory = accessMenuAdapters.get(name)

  return factory ? withAdapterName(name, factory()) : null
}
