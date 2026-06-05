import type { NuvaPermissionMatchMode } from '../../../../config'

type ServerPermissionInput = string | string[]

export interface NuvaAuthServerPermissionAdapter {
  hasPermission?: (event: unknown, permission: ServerPermissionInput, mode: NuvaPermissionMatchMode) => Promise<boolean> | boolean
}

export interface NuvaAuthServerAdapterCore<TContext = unknown> {
  resolveContext?: (event: unknown) => Promise<TContext | null> | TContext | null
  requireAuth?: (event: unknown) => Promise<TContext | null | undefined> | TContext | null | undefined
  permission?: NuvaAuthServerPermissionAdapter
}

export type NuvaAuthServerAdapter<TContext = unknown> = NuvaAuthServerAdapterCore<TContext> & {
  readonly name: string
}

export type NuvaAuthServerAdapterFactory<TContext = unknown> = () => NuvaAuthServerAdapterCore<TContext>

const serverAdapters = new Map<string, NuvaAuthServerAdapterFactory>()

export function defineServerAuthAdapter<TContext = unknown>(factory: NuvaAuthServerAdapterFactory<TContext>) {
  return factory
}

export function registerServerAuthAdapter<TContext = unknown>(name: string, factory: NuvaAuthServerAdapterFactory<TContext>) {
  serverAdapters.set(name, factory as NuvaAuthServerAdapterFactory)
}

export function resetServerAuthAdapters() {
  serverAdapters.clear()
}

function withAdapterName<TAdapter extends object>(name: string, adapter: TAdapter): TAdapter & { readonly name: string } {
  return {
    ...adapter,
    name,
  }
}

export function useServerAuthAdapter<TContext = unknown>(name: string): NuvaAuthServerAdapter<TContext> | null {
  const factory = serverAdapters.get(name)

  return factory
    ? withAdapterName(name, factory() as NuvaAuthServerAdapterCore<TContext>)
    : null
}
