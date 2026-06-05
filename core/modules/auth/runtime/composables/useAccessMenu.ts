import type { RouteRecordNormalized } from 'vue-router'
import type { NuvaAccessMenuItem, NuvaPermissionMatchMode } from '../../../../config'
import { useRouter } from 'vue-router'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAccessMenuState } from '../internal/useAccessMenuState'
import { useNuvaAuthResolvers } from '../internal/useNuvaAuthResolvers'
import { firstAccessMenuNumber, firstAccessMenuString, normalizeAccessMenus, toAccessMenuList, validateAccessMenus } from '../utils/access-menu'
import { fetchRemoteAccessMenu } from '../utils/remote'
import { usePermission } from './usePermission'

type AccessCheck = Pick<NuvaAccessMenuItem, 'roles' | 'permissions' | 'scopes' | 'roleMode' | 'permissionMode'>

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function toMatchMode(value: unknown): NuvaPermissionMatchMode | undefined {
  return value === 'any' || value === 'all' ? value : undefined
}

function fallbackValue(primary: unknown, fallback: unknown) {
  return primary ?? fallback
}

function isAccessMenuItem(value: NuvaAccessMenuItem | null | undefined): value is NuvaAccessMenuItem {
  return value !== null && value !== undefined
}

function withChildren(item: NuvaAccessMenuItem, children: NuvaAccessMenuItem[]): NuvaAccessMenuItem {
  return children.length ? { ...item, children } : item
}

function sortMenus(items: NuvaAccessMenuItem[]): NuvaAccessMenuItem[] {
  return [...items]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => {
      if (!item.children?.length) {
        return item
      }

      return {
        ...item,
        children: sortMenus(item.children),
      }
    })
}

function isFresh(timestamp: number, maxAge: number) {
  return maxAge > 0 && timestamp > 0 && Date.now() - timestamp < maxAge
}

function getRouteAccess(route?: RouteRecordNormalized | null): AccessCheck {
  const meta = toRecord(route?.meta)
  const auth = toRecord(meta.auth)

  return {
    roles: toAccessMenuList(auth.roles || meta.roles),
    permissions: toAccessMenuList(auth.permissions || meta.permissions),
    scopes: toAccessMenuList(auth.scopes || meta.scopes),
    roleMode: toMatchMode(auth.roleMode || meta.roleMode),
    permissionMode: toMatchMode(auth.permissionMode || meta.permissionMode),
  }
}

function getRouteMenus(routes: RouteRecordNormalized[]): NuvaAccessMenuItem[] {
  return routes
    .map<NuvaAccessMenuItem | null>((route) => {
      const meta = toRecord(route.meta)
      const menu = meta.menu

      if (!menu) {
        return null
      }

      const menuMeta = toRecord(menu)
      const access = getRouteAccess(route)
      const name = String(route.name || '')

      return {
        id: firstAccessMenuString(menuMeta.id, menuMeta.key, name, route.path),
        title: firstAccessMenuString(menuMeta.title, menuMeta.label, menuMeta.text, name, route.path),
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
    .filter(isAccessMenuItem)
}

function findRoute(item: NuvaAccessMenuItem, routes: RouteRecordNormalized[]): RouteRecordNormalized | null {
  if (item.name) {
    const byName = routes.find(route => String(route.name || '') === item.name)

    if (byName) {
      return byName
    }
  }

  return item.path ? routes.find(route => route.path === item.path) || null : null
}

function isRouteMenu(item: NuvaAccessMenuItem) {
  return !item.external && (!item.type || item.type === 'route') && (!!item.path || !!item.name)
}

function isGroupMenu(item: NuvaAccessMenuItem) {
  return item.type === 'group' || (!item.path && !item.name && !item.external)
}

function describeMenuItem(item: NuvaAccessMenuItem) {
  return item.id || item.name || item.path || item.title || 'unknown'
}

function warnAccessMenuIssue(warned: Set<string>, key: string, message: string, detail: Record<string, unknown>) {
  if (warned.has(key)) {
    return
  }

  warned.add(key)
  console.warn(message, detail)
}

function warnAccessMenuIssues(items: NuvaAccessMenuItem[], routes: RouteRecordNormalized[], strictRoute: boolean, routePrune: boolean, warned: Set<string>) {
  if (import.meta.env.PROD) {
    return
  }

  for (const issue of validateAccessMenus(items, routes, { strictRoute, routePrune })) {
    if (issue.type === 'missing-route') {
      warnAccessMenuIssue(
        warned,
        `${describeMenuItem(issue.menu)}:missing-route`,
        `[nuva/auth] access menu "${describeMenuItem(issue.menu)}" points to a route that does not exist.`,
        { menu: issue.menu },
      )

      continue
    }

    if (issue.type === 'access-mismatch' && issue.field && issue.route) {
      warnAccessMenuIssue(
        warned,
        `${describeMenuItem(issue.menu)}:${issue.route.path}:${issue.field}:${issue.menuAccess?.join(',')}:${issue.routeAccess?.join(',')}`,
        `[nuva/auth] access menu "${describeMenuItem(issue.menu)}" ${issue.field} do not match route meta ${issue.field}.`,
        {
          menu: issue.menu,
          route: issue.route,
          menuAccess: issue.menuAccess,
          routeAccess: issue.routeAccess,
        },
      )
    }
  }
}

function canAccess(access: AccessCheck, permission: ReturnType<typeof usePermission>) {
  const roleMode = access.roleMode || 'any'
  const permissionMode = access.permissionMode || 'all'
  const roles = access.roles || []
  const scopes = access.scopes || []
  const permissions = access.permissions || []

  if (roles.length && !permission.hasRole(roles, roleMode)) {
    return false
  }

  if (scopes.length && !permission.hasScope(scopes, permissionMode)) {
    return false
  }

  if (permissions.length) {
    return permissionMode === 'any'
      ? permission.any(permissions)
      : permission.all(permissions)
  }

  return true
}

function filterMenus(items: NuvaAccessMenuItem[], routes: RouteRecordNormalized[], permission: ReturnType<typeof usePermission>, filter: boolean, routePrune: boolean, strictRoute: boolean): NuvaAccessMenuItem[] {
  return items
    .map<NuvaAccessMenuItem | null>((item) => {
      const route = findRoute(item, routes)
      const children = filterMenus(item.children || [], routes, permission, filter, routePrune, strictRoute)

      if (item.hidden) {
        return null
      }

      if (routePrune && isRouteMenu(item) && !route) {
        return children.length ? withChildren(item, children) : null
      }

      const routeAccess = getRouteAccess(route)
      const routeAllowed = !strictRoute || canAccess(routeAccess, permission)
      const menuAllowed = !filter || canAccess(item, permission)
      const selfVisible = item.external || isGroupMenu(item) || !!route || !routePrune

      if ((!selfVisible || !menuAllowed || !routeAllowed) && !children.length) {
        return null
      }

      return withChildren(item, children)
    })
    .filter(isAccessMenuItem)
}

export function useAccessMenu() {
  const config = useNuvaConfig().auth
  const state = useAccessMenuState()
  const permission = usePermission()
  const resolvers = useNuvaAuthResolvers()
  const warnedAccessMenuIssues = new Set<string>()

  const rawMenus = computed<NuvaAccessMenuItem[]>(() => sortMenus(config.accessMenu.provider === 'route'
    ? getRouteMenus(useRouter().getRoutes())
    : state.value.menus))
  const menus = computed<NuvaAccessMenuItem[]>(() => {
    const routeList = config.accessMenu.routePrune || config.accessMenu.strictRoute
      ? useRouter().getRoutes()
      : []

    if (config.accessMenu.provider !== 'route' && (config.accessMenu.routePrune || config.accessMenu.strictRoute)) {
      warnAccessMenuIssues(rawMenus.value, routeList, config.accessMenu.strictRoute, config.accessMenu.routePrune, warnedAccessMenuIssues)
    }

    return config.accessMenu.filter || config.accessMenu.routePrune || config.accessMenu.strictRoute
      ? filterMenus(rawMenus.value, routeList, permission, config.accessMenu.filter, config.accessMenu.routePrune, config.accessMenu.strictRoute)
      : rawMenus.value
  })

  function setMenus(items: unknown) {
    state.value.menus = normalizeAccessMenus(items)
    state.value.loadedAt = state.value.menus.length ? Date.now() : 0
  }

  function clearMenus() {
    state.value.menus = []
    state.value.loadedAt = 0
  }

  async function refresh() {
    if (config.accessMenu.provider !== 'endpoint') {
      return rawMenus.value
    }

    const request = config.accessMenu.remote.menu

    if (!request?.url && !config.accessMenu.remote.menuResolver) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Nuva access menu endpoint is not configured',
      })
    }

    const result = await fetchRemoteAccessMenu(config, request, resolvers.value.menu)
    setMenus(result)
    return rawMenus.value
  }

  async function ensure() {
    if (config.accessMenu.provider === 'none' || config.accessMenu.provider === 'route') {
      return menus.value
    }

    if (state.value.menus.length && isFresh(state.value.loadedAt, config.accessMenu.cacheMaxAge)) {
      return menus.value
    }

    if (config.accessMenu.provider === 'endpoint') {
      await refresh()
    }

    return menus.value
  }

  return {
    menus,
    rawMenus,
    ready: computed(() => config.accessMenu.provider === 'none' || state.value.loadedAt > 0 || rawMenus.value.length > 0),
    setMenus,
    clearMenus,
    refresh,
    ensure,
  }
}
