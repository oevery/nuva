import type { NuvaAccessMenuItem, NuvaPermissionMatchMode } from '../../../../config'

type MenuInput = Record<string, unknown>

export function toAccessMenuList(value: unknown) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)]
}

export function firstAccessMenuString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value) {
      return value
    }
  }

  return ''
}

export function firstAccessMenuNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number') {
      return value
    }
  }
}

function getChildren(item: MenuInput) {
  return item.children || item.routes || item.items
}

function isExternalPath(path: string) {
  return /^https?:\/\//.test(path) || path.startsWith('//')
}

function getMenuField(value: unknown) {
  if (!value || typeof value !== 'object') {
    return
  }

  const record = value as MenuInput
  return record.menus || record.menu || record.routes
}

export function extractAccessMenus(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return getMenuField(value) || []
}

export function hasAccessMenus(value: unknown) {
  return Array.isArray(getMenuField(value))
}

export function normalizeAccessMenus(value: unknown): NuvaAccessMenuItem[] {
  const items = extractAccessMenus(value)

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter(item => item && typeof item === 'object')
    .map((raw, index) => {
      const item = raw as MenuInput
      const children = normalizeAccessMenus(getChildren(item))
      const path = firstAccessMenuString(item.path, item.url, item.href)
      const name = firstAccessMenuString(item.name, item.routeName)
      const title = firstAccessMenuString(item.title, item.label, item.name, item.text, path)
      const id = firstAccessMenuString(item.id, item.key, name, path, title, `menu-${index}`)

      return {
        id,
        title,
        path: path || undefined,
        name: name || undefined,
        icon: firstAccessMenuString(item.icon) || undefined,
        order: firstAccessMenuNumber(item.order, item.sort, item.sortOrder),
        hidden: item.hidden === true || item.hideInMenu === true,
        external: item.external === true || item.isExternal === true || isExternalPath(path),
        type: firstAccessMenuString(item.type) as NuvaAccessMenuItem['type'] || undefined,
        target: firstAccessMenuString(item.target) || undefined,
        roles: toAccessMenuList(item.roles || item.role),
        permissions: toAccessMenuList(item.permissions || item.permission),
        scopes: toAccessMenuList(item.scopes || item.scopeKeys || item.scope),
        roleMode: item.roleMode as NuvaPermissionMatchMode | undefined,
        permissionMode: item.permissionMode as NuvaPermissionMatchMode | undefined,
        children,
        meta: item.meta && typeof item.meta === 'object' ? item.meta as Record<string, unknown> : undefined,
      }
    })
}
