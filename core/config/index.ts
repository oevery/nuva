export interface NuvaAuthTokenConfig {
  /**
   * SSR 和客户端请求中用于读取 token 的 cookie 名称。
   * @default `token`
   */
  cookieName: string
  /**
   * 客户端用于读取 token 的 localStorage 键名。
   * @default `token`
   */
  storageKey: string
  /**
   * 发送 token 时使用的请求头名称。
   * @default `Authorization`
   */
  header: string
  /**
   * token 前缀；后端需要原始 token 时传空字符串。
   * @default `Bearer`
   */
  prefix: string
}

export interface NuvaApiConfig {
  /**
   * API 基础地址；SSR 时相对地址会基于当前请求 origin 解析。
   * @default `/api`
   */
  baseURL: string
  /**
   * 是否将 `{ code, message, data }` 这类通用响应包裹层自动解包为 `data`。
   * @default `true`
   */
  envelopeUnwrap: boolean
  /**
   * 业务成功码，使用英文逗号分隔，例如 `0`、`200` 或 `0,200,SUCCESS`。
   * @default `0`
   */
  successCodes: string
}

export type NuvaAuthModuleMode = 'frontend' | 'fullstack'
export type NuvaAuthProvider = 'token' | 'better-auth'
export type NuvaAuthPreset = 'token' | 'remote' | 'hybrid' | 'better-auth'

export type NuvaPermissionSource = 'local' | 'remote' | 'hybrid' | 'better-auth'
export type NuvaPermissionProvider = 'local' | 'profile' | 'endpoint' | 'remote' | 'hybrid' | 'better-auth'
export type NuvaPermissionMatchMode = 'any' | 'all'
export type NuvaPermissionDecision = 'allow' | 'deny' | 'unknown'
export type NuvaAccessMenuSource = 'none' | 'profile' | 'endpoint' | 'route'
export type NuvaAccessMenuType = 'route' | 'group' | 'link' | 'action' | 'iframe' | 'remote'

export interface NuvaAccessScope {
  userId?: string | number
  tenantId?: string | number
  organizationId?: string | number
  departmentId?: string | number
  storeId?: string | number
  projectId?: string | number
  [key: string]: string | number | Array<string | number> | null | undefined
}

export interface NuvaDataAccess {
  type: 'all' | 'self' | 'department' | 'organization' | 'tenant' | 'custom'
  values?: Array<string | number>
  [key: string]: unknown
}

export interface NuvaPermissionState {
  roles: string[]
  permissions: string[]
  scope?: NuvaAccessScope
  dataAccess?: NuvaDataAccess
  source?: NuvaPermissionSource
}

export interface NuvaAccessMenuItem {
  id: string
  title: string
  path?: string
  name?: string
  icon?: string
  order?: number
  hidden?: boolean
  external?: boolean
  type?: NuvaAccessMenuType
  target?: '_blank' | '_self' | string
  roles?: string[]
  permissions?: string[]
  scopes?: string[]
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
  children?: NuvaAccessMenuItem[]
  meta?: Record<string, unknown>
}

export type NuvaRemoteRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface NuvaRemoteRequestConfig {
  url: string
  method?: NuvaRemoteRequestMethod
  data?: Record<string, unknown> | Array<unknown>
  params?: Record<string, unknown> | string
  headers?: Record<string, string>
  meta?: Record<string, unknown>
}

export interface NuvaRemoteResolverContext {
  request: NuvaRemoteRequestConfig | null
  config: NuvaResolvedAuthConfig
  requestWith: <T>(request?: NuvaRemoteRequestConfig | null) => Promise<T>
}

export type NuvaProfileResolver<TUser = unknown> = (context: NuvaRemoteResolverContext) => Promise<TUser>
export type NuvaPermissionResolver = (context: NuvaRemoteResolverContext) => Promise<NuvaPermissionState>
export type NuvaAccessMenuResolver = (context: NuvaRemoteResolverContext) => Promise<NuvaAccessMenuItem[] | { menus?: unknown, menu?: unknown, routes?: unknown }>
export type NuvaMenuResolver = NuvaAccessMenuResolver

export interface NuvaRemotePermissionConfig {
  profileEndpoint: string
  permissionEndpoint: string
  profile: string
  permission: string
  profileResolver: boolean
  permissionResolver: boolean
  cacheMaxAge: number
}

export interface NuvaRemotePermissionOptions extends Omit<NuvaRemotePermissionConfig, 'profile' | 'permission'> {
  profile?: NuvaRemoteRequestConfig | null
  permission?: NuvaRemoteRequestConfig | null
}

export interface NuvaRemoteAccessMenuConfig {
  menuEndpoint: string
  menu: string
  menuResolver: boolean
}

export interface NuvaRemoteAccessMenuOptions extends Omit<NuvaRemoteAccessMenuConfig, 'menu'> {
  menu?: NuvaRemoteRequestConfig | null
}

export interface NuvaResolvedRemoteAccessMenuConfig extends Omit<NuvaRemoteAccessMenuConfig, 'menu'> {
  menu: NuvaRemoteRequestConfig | null
}

export interface NuvaResolvedRemotePermissionConfig extends Omit<NuvaRemotePermissionConfig, 'profile' | 'permission'> {
  profile: NuvaRemoteRequestConfig | null
  permission: NuvaRemoteRequestConfig | null
}

export interface NuvaPermissionConfig {
  provider?: NuvaPermissionProvider
  source: NuvaPermissionSource
  forbiddenPath: string
  permissionMode: NuvaPermissionMatchMode
  roleMode: NuvaPermissionMatchMode
  local: NuvaPermissionState
  remote: NuvaRemotePermissionConfig
  betterAuth: {
    hasPermission: boolean
    organization: boolean
    dynamicAccessControl: boolean
  }
}

export interface NuvaResolvedPermissionConfig extends Omit<NuvaPermissionConfig, 'remote'> {
  remote: NuvaResolvedRemotePermissionConfig
}

export interface NuvaAccessMenuConfig {
  provider: NuvaAccessMenuSource
  filter: boolean
  routePrune: boolean
  strictRoute: boolean
  cacheMaxAge: number
  remote: NuvaRemoteAccessMenuConfig
}

export interface NuvaResolvedAccessMenuConfig extends Omit<NuvaAccessMenuConfig, 'remote'> {
  remote: NuvaResolvedRemoteAccessMenuConfig
}

export interface NuvaAuthConfig {
  preset?: NuvaAuthPreset
  enabled: boolean
  mode: NuvaAuthModuleMode
  provider: NuvaAuthProvider
  loginPath: string
  homePath: string
  redirectQuery: string
  global: boolean
  publicRoutes: string[]
  token: NuvaAuthTokenConfig
  permission: NuvaPermissionConfig
  accessMenu: NuvaAccessMenuConfig
  betterAuth: {
    basePath: string
    serverAuthImport: string
  }
}

export interface NuvaResolvedAuthConfig extends Omit<NuvaAuthConfig, 'permission' | 'accessMenu'> {
  permission: NuvaResolvedPermissionConfig
  accessMenu: NuvaResolvedAccessMenuConfig
}

export type NuvaAuthResolverEntry = string

export interface NuvaAuthResolvers {
  profile?: NuvaAuthResolverEntry
  permission?: NuvaAuthResolverEntry
  menu?: NuvaAuthResolverEntry
}

export interface NuvaConfigFile {
  api?: Partial<NuvaApiConfig>
  auth?: NuvaAuthModuleOptions
  resolvers?: NuvaAuthResolvers
}

export interface NuvaModuleOptions extends Partial<NuvaConfigFile> {
  configFile?: string
}

export type NuvaAuthProjectConfig = NuvaConfigFile

export interface NuvaAuthModuleOptions extends Partial<Omit<NuvaAuthConfig, 'token' | 'betterAuth' | 'permission' | 'accessMenu'>> {
  permission?: Partial<Omit<NuvaPermissionConfig, 'local' | 'remote' | 'betterAuth'>> & {
    local?: Partial<NuvaPermissionState>
    remote?: Partial<NuvaRemotePermissionOptions>
    betterAuth?: Partial<NuvaPermissionConfig['betterAuth']>
  }
  accessMenu?: Partial<Omit<NuvaAccessMenuConfig, 'remote'>> & {
    remote?: Partial<NuvaRemoteAccessMenuOptions>
  }
  betterAuth?: Partial<NuvaAuthConfig['betterAuth']>
}

export interface NuvaPublicConfig {
  api: NuvaApiConfig
  auth: NuvaAuthConfig
}

export interface NuvaResolvedConfig extends Omit<NuvaPublicConfig, 'auth'> {
  auth: NuvaResolvedAuthConfig
  resolvers: {
    profile: NuvaProfileResolver | null
    permission: NuvaPermissionResolver | null
    menu: NuvaMenuResolver | null
  }
}

export const defaultNuvaApiConfig = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0',
} satisfies NuvaApiConfig

export const defaultNuvaPermissionConfig = {
  source: 'local',
  forbiddenPath: '/403',
  permissionMode: 'all',
  roleMode: 'any',
  local: {
    roles: [],
    permissions: [],
    scope: {},
    dataAccess: { type: 'self' },
    source: 'local',
  },
  remote: {
    profileEndpoint: '',
    permissionEndpoint: '',
    profile: '',
    permission: '',
    profileResolver: false,
    permissionResolver: false,
    cacheMaxAge: 0,
  },
  betterAuth: {
    hasPermission: false,
    organization: false,
    dynamicAccessControl: false,
  },
} satisfies NuvaPermissionConfig

export const defaultNuvaAccessMenuConfig = {
  provider: 'none',
  filter: true,
  routePrune: true,
  strictRoute: true,
  cacheMaxAge: 0,
  remote: {
    menuEndpoint: '',
    menu: '',
    menuResolver: false,
  },
} satisfies NuvaAccessMenuConfig

export const defaultNuvaAuthConfig = {
  enabled: false,
  mode: 'frontend',
  provider: 'token',
  loginPath: '/login',
  homePath: '/',
  redirectQuery: 'redirect',
  global: false,
  publicRoutes: ['/login'],
  token: {
    cookieName: 'token',
    storageKey: 'token',
    header: 'Authorization',
    prefix: 'Bearer',
  },
  permission: defaultNuvaPermissionConfig,
  accessMenu: defaultNuvaAccessMenuConfig,
  betterAuth: {
    basePath: '/api/auth',
    serverAuthImport: '~~/server/utils/better-auth',
  },
} satisfies NuvaAuthConfig

export const defaultNuvaPublicConfig = {
  api: defaultNuvaApiConfig,
  auth: defaultNuvaAuthConfig,
} satisfies NuvaPublicConfig

export function defineNuvaConfig(config: NuvaConfigFile) {
  return config
}

export function serializeNuvaRemoteRequest(request?: NuvaRemoteRequestConfig | null) {
  return request ? JSON.stringify(request) : ''
}

export function parseNuvaRemoteRequest(request?: string) {
  if (!request) {
    return null
  }

  try {
    return JSON.parse(request) as NuvaRemoteRequestConfig
  }
  catch {
    return {
      url: request,
      method: 'GET',
    } satisfies NuvaRemoteRequestConfig
  }
}
