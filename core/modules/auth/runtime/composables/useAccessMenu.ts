import type { RouteRecordNormalized } from 'vue-router'
import type { NuvaAccessMenuItem } from '../../../../config'
import { useRouter } from 'vue-router'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAccessMenuAdapter } from '../adapters/registry'
import { validateAccessMenus } from '../utils/access-menu'
import { resolveRouteAccessMeta } from '../utils/route-access'
import { usePermission } from './usePermission'

type AccessCheck = Pick<NuvaAccessMenuItem, 'roles' | 'permissions' | 'scopes' | 'roleMode' | 'permissionMode'>

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

function getRouteAccess(route?: RouteRecordNormalized | null): AccessCheck {
  const access = resolveRouteAccessMeta(route)

  return {
    roles: access.roles,
    permissions: access.permissions,
    scopes: access.scopes,
    roleMode: access.roleMode,
    permissionMode: access.permissionMode,
  }
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
  const adapter = useAccessMenuAdapter(config.accessMenu.source)
  const permission = usePermission()
  const warnedAccessMenuIssues = new Set<string>()

  if (!adapter) {
    throw createError({
      statusCode: 500,
      statusMessage: `Nuva access menu adapter "${config.accessMenu.source}" is not registered`,
    })
  }

  const accessMenuAdapter = adapter
  const rawMenus = computed<NuvaAccessMenuItem[]>(() => sortMenus(accessMenuAdapter.rawMenus?.value || accessMenuAdapter.menus.value))
  const menus = computed<NuvaAccessMenuItem[]>(() => {
    const routeList = config.accessMenu.routePrune || config.accessMenu.strictRoute
      ? useRouter().getRoutes()
      : []

    if (config.accessMenu.routePrune || config.accessMenu.strictRoute) {
      warnAccessMenuIssues(rawMenus.value, routeList, config.accessMenu.strictRoute, config.accessMenu.routePrune, warnedAccessMenuIssues)
    }

    return config.accessMenu.filter || config.accessMenu.routePrune || config.accessMenu.strictRoute
      ? filterMenus(rawMenus.value, routeList, permission, config.accessMenu.filter, config.accessMenu.routePrune, config.accessMenu.strictRoute)
      : rawMenus.value
  })

  async function refresh() {
    await accessMenuAdapter.refresh?.()
    return menus.value
  }

  async function ensure() {
    await accessMenuAdapter.ensure?.()
    return menus.value
  }

  return {
    menus,
    rawMenus,
    ready: computed(() => accessMenuAdapter.loaded.value),
    setMenus: (items: unknown) => accessMenuAdapter.setMenus?.(items),
    clearMenus: () => accessMenuAdapter.clearMenus?.(),
    refresh,
    ensure,
  }
}
