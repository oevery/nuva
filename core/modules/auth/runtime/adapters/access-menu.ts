import type { RouteRecordNormalized } from 'vue-router'
import type { NuvaAccessMenuItem } from '../../../../config'
import type { NuvaAccessMenuAdapterCore } from './registry'
import { useRouter } from 'vue-router'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAccessMenuState } from '../internal/useAccessMenuState'
import { useNuvaAuthResolvers } from '../internal/useNuvaAuthResolvers'
import { firstAccessMenuNumber, firstAccessMenuString, normalizeAccessMenus, toAccessMenuList } from '../utils/access-menu'
import { fetchRemoteAccessMenu, getRemoteRequestKey, useRemoteRequestRuntimeContext } from '../utils/remote'
import { resolveRouteAccessMeta } from '../utils/route-access'
import { fallbackValue, isFresh, toMatchMode, toRecord } from '../utils/shared'

function isDynamicRoute(path: string) {
  return path.includes(':') || path.includes('*')
}

function isExcluded(path: string, excluded: string[]) {
  return excluded.some((item) => {
    if (item.endsWith('/**')) {
      return path.startsWith(item.slice(0, -3))
    }

    return item === path
  })
}

function isPublicRoute(path: string, publicRoutes: string[]) {
  return publicRoutes.some((route) => {
    if (route.endsWith('/**')) {
      return path.startsWith(route.slice(0, -3))
    }

    return route === path
  })
}

function getRouteMenus(routes: RouteRecordNormalized[]): NuvaAccessMenuItem[] {
  const config = useNuvaConfig().auth
  const routeConfig = config.accessMenu.route

  return routes
    .map<NuvaAccessMenuItem | null>((route) => {
      const meta = toRecord(route.meta)
      const rawMenu = meta.menu
      const hasMenuMeta = !!rawMenu && typeof rawMenu === 'object'

      if (rawMenu === false || (routeConfig.mode === 'meta' && !hasMenuMeta)) {
        return null
      }

      if (!routeConfig.includeDynamic && isDynamicRoute(route.path)) {
        return null
      }

      if (isExcluded(route.path, routeConfig.exclude)) {
        return null
      }

      if (!hasMenuMeta && (meta.auth === false || isPublicRoute(route.path, config.publicRoutes))) {
        return null
      }

      const menuMeta = hasMenuMeta ? toRecord(rawMenu) : {}
      const access = resolveRouteAccessMeta(route)
      const name = String(route.name || '')

      return {
        id: firstAccessMenuString(menuMeta.id, menuMeta.key, name, route.path),
        title: firstAccessMenuString(menuMeta.title, menuMeta.label, menuMeta.text, toRecord(meta).title, name, route.path),
        path: firstAccessMenuString(menuMeta.path, route.path),
        name: firstAccessMenuString(menuMeta.name, name),
        icon: firstAccessMenuString(menuMeta.icon) || undefined,
        order: firstAccessMenuNumber(menuMeta.order, menuMeta.sort, menuMeta.sortOrder),
        hidden: menuMeta.hidden === true || menuMeta.hideInMenu === true,
        roles: toAccessMenuList(fallbackValue(menuMeta.roles, access.roles)),
        permissions: toAccessMenuList(fallbackValue(menuMeta.permissions, access.permissions)),
        scopes: toAccessMenuList(fallbackValue(menuMeta.scopes, access.scopes)),
        roleMode: toMatchMode(menuMeta.roleMode) || access.roleMode,
        permissionMode: toMatchMode(menuMeta.permissionMode) || access.permissionMode,
        meta: menuMeta.meta && typeof menuMeta.meta === 'object' ? menuMeta.meta as Record<string, unknown> : undefined,
      } satisfies NuvaAccessMenuItem
    })
    .filter((item): item is NuvaAccessMenuItem => !!item)
}

export function createRouteAccessMenuAdapter(): NuvaAccessMenuAdapterCore {
  const rawMenus = computed(() => getRouteMenus(useRouter().getRoutes()))

  return {
    menus: rawMenus,
    rawMenus,
    loaded: computed(() => true),
    refresh: () => rawMenus.value,
    ensure: () => rawMenus.value,
  }
}

export function createLocalAccessMenuAdapter(): NuvaAccessMenuAdapterCore {
  const config = useNuvaConfig().auth
  const rawMenus = computed(() => normalizeAccessMenus(config.accessMenu.local.items))

  return {
    menus: rawMenus,
    rawMenus,
    loaded: computed(() => true),
    refresh: () => rawMenus.value,
    ensure: () => rawMenus.value,
  }
}

export function createRemoteAccessMenuAdapter(): NuvaAccessMenuAdapterCore {
  const config = useNuvaConfig().auth
  const state = useAccessMenuState()
  const resolvers = useNuvaAuthResolvers()
  const remoteRequestRuntime = useRemoteRequestRuntimeContext()
  const rawMenus = computed(() => state.value.menus)

  function setMenus(items: unknown) {
    state.value.menus = normalizeAccessMenus(items)
    state.value.loadedAt = Date.now()
  }

  function clearMenus() {
    state.value.menus = []
    state.value.loadedAt = 0
  }

  async function refresh() {
    const remote = config.accessMenu.remote

    if (!remote.request?.url && !remote.resolver) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Nuva access menu endpoint is not configured',
      })
    }

    setMenus(await fetchRemoteAccessMenu(config, remote.request, resolvers.value.menu, {
      cacheMaxAge: remote.cacheMaxAge ?? config.accessMenu.cacheMaxAge,
      reuseCached: getRemoteRequestKey(remote.request) === getRemoteRequestKey(config.user.remote.request),
      runtime: remoteRequestRuntime,
      map: remote.map,
    }))

    return rawMenus.value
  }

  async function ensure() {
    const cacheMaxAge = config.accessMenu.remote.cacheMaxAge ?? config.accessMenu.cacheMaxAge

    if (state.value.loadedAt && isFresh(state.value.loadedAt, cacheMaxAge)) {
      return rawMenus.value
    }

    await refresh()
    return rawMenus.value
  }

  return {
    menus: rawMenus,
    rawMenus,
    loaded: computed(() => state.value.loadedAt > 0),
    setMenus,
    clearMenus,
    refresh,
    ensure,
  }
}
