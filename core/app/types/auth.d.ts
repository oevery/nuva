import type { NuvaPermissionMatchMode } from '../../config'

interface NuvaPageAuthMeta {
  roles?: string[]
  permissions?: string[]
  scopes?: string[]
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
  forbiddenPath?: string
}

declare module '#app' {
  interface PageMeta {
    /** 是否需要登录；false 表示公开页面，会跳过认证和路由级访问控制。 */
    auth?: boolean | NuvaPageAuthMeta
    /** 访问页面所需角色。 */
    roles?: string[]
    /** 访问页面所需功能权限，推荐 `resource:action` 格式。 */
    permissions?: string[]
    /** 访问页面所需作用域字段，例如 tenantId、organizationId、departmentId。 */
    scopes?: string[]
    /** 角色匹配模式。 */
    roleMode?: NuvaPermissionMatchMode
    /** 权限和作用域匹配模式。 */
    permissionMode?: NuvaPermissionMatchMode
    /** 当前页面无权限时的跳转路径。 */
    forbiddenPath?: string
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: boolean | NuvaPageAuthMeta
    roles?: string[]
    permissions?: string[]
    scopes?: string[]
    roleMode?: NuvaPermissionMatchMode
    permissionMode?: NuvaPermissionMatchMode
    forbiddenPath?: string
  }
}

export {}
